import { trace } from '../../../engine/tracer'
import type { Algorithm } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/* Linked lists — animations, quarter 2: reversal, fast/slow pointers, cycles, palindromes. */

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

/* ───────────────────────── 8. Iterative reversal ───────────────────────── */

export const llReverseIter: Algorithm = {
  id: 'll-reverse-iter',
  title: 'Reverse a list in place — three pointers, one invariant',
  blurb: 'prev | cur | rest. At every moment the arrows left of cur are flipped and the ones right of cur are untouched. Save next before flipping, or the rest of the list is lost.',
  legend: { active: 'cur', best: 'prev (reversed part)', compare: 'nxt (saved)', done: 'flipped arrow', new: 'new head' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5', maxLen: 10 }],
  random: () => ({ arr: list(rarr(rint(4, 8), 1, 9)) }),
  code: {
    pseudo: `
function reverse(head)
  prev ← null; cur ← head                 // @init
  while cur ≠ null                        // @loop
    nxt ← cur.next                        // @save
    cur.next ← prev                       // @flip
    prev ← cur; cur ← nxt                 // @advance
  return prev                             // @done`,
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
    java: `
ListNode reverse(ListNode head) {
    ListNode prev = null, cur = head;        // @init
    while (cur != null) {                    // @loop
        ListNode nxt = cur.next;             // @save
        cur.next = prev;                     // @flip
        prev = cur; cur = nxt;               // @advance
    }
    return prev;                             // @done
}`,
    js: `
const reverse = (head) => {
    let prev = null, cur = head;             // @init
    while (cur) {                            // @loop
        const nxt = cur.next;                // @save
        cur.next = prev;                     // @flip
        prev = cur; cur = nxt;               // @advance
    }
    return prev;                             // @done
};`,
    c: `
struct Node* reverse(struct Node* head) {
    struct Node *prev = NULL, *cur = head;   // @init
    while (cur) {                            // @loop
        struct Node* nxt = cur->next;        // @save
        cur->next = prev;                    // @flip
        prev = cur; cur = nxt;               // @advance
    }
    return prev;                             // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', a, { label: 'list', showHead: false })
      let prev: string | null = null
      let cur = L.head
      L.ptr('prev', null).ptr('cur', cur)
      t.step('init', `prev = null (the reversed list is empty), cur = head = ${L.v(cur)}. Invariant: left of cur everything points backwards; right of cur nothing has been touched.`, { flipped: 0 })
      let flipped = 0
      while (cur) {
        L.clear().role(cur, 'active')
        if (prev) L.role(prev, 'best')
        t.step('loop', `cur is at ${L.v(cur)}.`, { flipped })
        const nxt = L.next(cur)
        L.ptr('nxt', nxt)
        if (nxt) L.role(nxt, 'compare')
        t.step('save', `Save nxt = ${nxt ? L.v(nxt) : 'null'} into a variable — the flip on the next line destroys cur's only route to the rest of the list.`, { flipped })
        L.link(cur, prev).linkRole(cur, 'swap')
        t.step('flip', `Flip: ${L.v(cur)}.next ← ${prev ? L.v(prev) : 'null'}. The arrow now points left.`, { flipped: flipped + 1 })
        L.role(cur, 'done')
        prev = cur
        cur = nxt
        L.ptr('prev', prev).ptr('cur', cur).ptr('nxt', undefined)
        flipped++
        t.step('advance', `Advance both pointers: prev = ${L.v(prev)}, cur = ${cur ? L.v(cur) : 'null'}. The boundary between flipped and untouched slides one node right.`, { flipped })
      }
      L.clear().setHead(prev).ptr('cur', undefined).ptr('prev', undefined).ptr('head', prev)
      L.role(prev!, 'new')
      t.step('done', `cur fell off the end (null). prev is the last node processed — the new head. n flips, 3 pointers, zero allocations.`, { flipped })
    }),
}

/* ───────────────────────── 9. Recursive reversal (call stack view) ───────────────────────── */

export const llReverseRec: Algorithm = {
  id: 'll-reverse-rec',
  title: 'Recursive reversal — the call stack does the walking',
  blurb: 'reverse(cur.next) flips the tail first; then cur.next.next = cur folds cur onto the end. Watch the stack grow to the base case and unwind, one fold per frame.',
  legend: { active: 'frame running now', done: 'flipped', compare: 'the fold cur.next.next = cur' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4', maxLen: 8 }],
  random: () => ({ arr: list(rarr(rint(3, 6), 1, 9)) }),
  code: {
    pseudo: `
function reverseRec(cur)
  if cur = null or cur.next = null: return cur        // @base
  newHead ← reverseRec(cur.next)                      // @recurse
  cur.next.next ← cur                                 // @fold
  cur.next ← null                                     // @sever
  return newHead                                      // @return`,
    cpp: `
ListNode* reverseRec(ListNode* cur) {
    if (!cur || !cur->next) return cur;    // @base
    ListNode* newHead = reverseRec(cur->next);  // @recurse
    cur->next->next = cur;                 // @fold
    cur->next = nullptr;                   // @sever
    return newHead;                        // @return
}`,
    python: `
def reverse_rec(cur):
    if not cur or not cur.next: return cur          # @base
    new_head = reverse_rec(cur.next)                # @recurse
    cur.next.next = cur                             # @fold
    cur.next = None                                 # @sever
    return new_head                                 # @return`,
    java: `
ListNode reverseRec(ListNode cur) {
    if (cur == null || cur.next == null) return cur;   // @base
    ListNode newHead = reverseRec(cur.next);           // @recurse
    cur.next.next = cur;                               // @fold
    cur.next = null;                                   // @sever
    return newHead;                                    // @return
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const S = t.stack('cs', 'call stack')
      const go = (cur: string | null): string | null => {
        if (!cur) return null
        S.push(`rev(${L.v(cur)})`)
        if (!L.next(cur)) {
          L.clear().role(cur, 'done')
          t.step('base', `rev(${L.v(cur)}): the last node has next = null — it is already "reversed" and will be the new head. Return it.`, { depth: S.length })
          S.pop()
          return cur
        }
        L.clear().role(cur, 'active')
        t.step('recurse', `rev(${L.v(cur)}) cannot act yet: it first calls rev(${L.v(L.next(cur))}) and waits. The stack grows.`, { depth: S.length })
        const newHead = go(L.next(cur))
        S.push(`rev(${L.v(cur)})`)
        L.clear().role(cur, 'active')
        const nxt = L.next(cur)!
        L.role(nxt, 'compare').linkRole(nxt, 'swap')
        t.step('fold', `Back in rev(${L.v(cur)}): cur.next.next ← cur makes ${L.v(nxt)} point back at ${L.v(cur)}. The tail end is already fully reversed.`, { depth: S.length })
        L.link(nxt, cur).linkRole(cur, 'swap')
        t.step('sever', `cur.next ← null: cut ${L.v(cur)}'s forward arrow, or the list would be a 2-cycle (${L.v(cur)} ⇄ ${L.v(nxt)}).`, { depth: S.length })
        L.role(cur, 'done').role(nxt, 'done')
        S.pop()
        t.step('return', `rev(${L.v(cur)}) returns the same newHead it received — the old tail. Stack depth ${S.length}.`, { depth: S.length })
        return newHead
      }
      const newHead = go(L.head)
      L.clear().setHead(newHead).ptr('head', newHead).relayout()
      t.step('return', `The unwinding is finished: newHead is the original last node, and every arrow now points left. Cost: O(n) time, O(n) stack — the iterative version's O(1) space is why interviews prefer it for long lists.`, { depth: 0 })
    }),
}

/* ───────────────────────── 10. Reverse a subrange [m, n] ───────────────────────── */

export const llReverseRange: Algorithm = {
  id: 'll-reverse-range',
  title: 'Reverse the sublist from position m to n',
  blurb: 'Anchor before the range with a dummy, then run the three-pointer flip exactly n−m+1 times and stitch both ends back. One pass, no extra list.',
  legend: { window: 'inside [m, n]', active: 'cur', best: 'prev inside range', swap: 'stitch being written', dim: 'outside the range' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5 6 7 8 9', maxLen: 10 },
    { name: 'm', label: 'From m (1-based)', type: 'number', default: '2', min: 1, max: 10 },
    { name: 'n', label: 'To n (1-based)', type: 'number', default: '7', min: 1, max: 10 },
  ],
  random: () => {
    const len = rint(4, 8)
    const m = rint(1, len - 1)
    return { arr: list(rarr(len, 1, 9)), m: String(m), n: String(rint(m, len)) }
  },
  code: {
    pseudo: `
function reverseRange(head, m, n)
  dummy ← Node(0); dummy.next ← head                // @dummy
  anchor ← dummy; move anchor to position m−1       // @anchor
  prev ← null; cur ← anchor.next                    // @init
  repeat n − m + 1 times                            // @loop
    nxt ← cur.next; cur.next ← prev                 // @flip
    prev ← cur; cur ← nxt                           // @advance
  anchor.next ← prev                                // @stitchfront
  (old range head).next ← cur                       // @stitchback
  return dummy.next                                 // @done`,
    cpp: `
ListNode* reverseRange(ListNode* head, int m, int n) {
    ListNode dummy(0); dummy.next = head;            // @dummy
    ListNode* anchor = &dummy;                       // @dummy
    for (int i = 1; i < m; i++) anchor = anchor->next;   // @anchor
    ListNode *prev = nullptr, *cur = anchor->next;   // @init
    ListNode* rangeHead = cur;
    for (int i = 0; i < n - m + 1; i++) {            // @loop
        ListNode* nxt = cur->next;                   // @flip
        cur->next = prev;                            // @flip
        prev = cur; cur = nxt;                       // @advance
    }
    anchor->next = prev;                             // @stitchfront
    rangeHead->next = cur;                           // @stitchback
    return dummy.next;                               // @done
}`,
    python: `
def reverse_range(head, m, n):
    dummy = Node(0); dummy.next = head               # @dummy
    anchor = dummy                                   # @dummy
    for _ in range(m - 1): anchor = anchor.next      # @anchor
    prev, cur = None, anchor.next                    # @init
    range_head = cur
    for _ in range(n - m + 1):                       # @loop
        nxt = cur.next                               # @flip
        cur.next = prev                              # @flip
        prev, cur = cur, nxt                         # @advance
    anchor.next = prev                               # @stitchfront
    range_head.next = cur                            # @stitchback
    return dummy.next                                # @done`,
    java: `
ListNode reverseRange(ListNode head, int m, int n) {
    ListNode dummy = new ListNode(0); dummy.next = head;   // @dummy
    ListNode anchor = dummy;                               // @dummy
    for (int i = 1; i < m; i++) anchor = anchor.next;      // @anchor
    ListNode prev = null, cur = anchor.next;               // @init
    ListNode rangeHead = cur;
    for (int i = 0; i < n - m + 1; i++) {                  // @loop
        ListNode nxt = cur.next;                           // @flip
        cur.next = prev;                                   // @flip
        prev = cur; cur = nxt;                             // @advance
    }
    anchor.next = prev;                                    // @stitchfront
    rangeHead.next = cur;                                  // @stitchback
    return dummy.next;                                     // @done
}`,
  },
  run: ({ arr, m, n }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const mm = nat(m, 'm', 1, a.length)
      const nn = nat(n, 'n', mm, a.length)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const realHead = L.head
      const dummy = L.add(0, 0)
      L.link(dummy, realHead).setHead(dummy).role(dummy, 'dim')
      let anchor = dummy
      L.ptr('anchor', anchor)
      t.step('dummy', `Dummy before the head so m = 1 needs no special case.`, { m: mm, n: nn, flips: 0 })
      for (let i = 1; i < mm; i++) {
        anchor = L.next(anchor)!
        L.ptr('anchor', anchor).role(anchor, 'active')
        t.step('anchor', `Walk the anchor to position ${mm - 1}: node ${L.v(anchor)}. It stays put and holds the front of the range.`, { m: mm, n: nn, flips: 0 })
      }
      L.clear()
      const idsAll = L.ids()
      idsAll.forEach((id, i) => {
        if (i >= mm - 1 && i <= nn - 1) L.role(id, 'window')
      })
      let prev: string | null = null
      let cur = L.next(anchor)
      const rangeHead = cur
      L.ptr('cur', cur).ptr('prev', null)
      t.step('init', `The range [${mm}, ${nn}] is highlighted: ${nn - mm + 1} nodes, starting at ${L.v(cur)}. Flip them with the usual three pointers — exactly ${nn - mm + 1} times, then stop.`, { m: mm, n: nn, flips: 0 })
      let flips = 0
      for (let i = 0; i < nn - mm + 1; i++) {
        L.clear().role(cur!, 'active')
        if (prev) L.role(prev, 'best')
        const nxt = L.next(cur)
        L.link(cur!, prev).linkRole(cur!, 'swap')
        t.step('flip', `Flip ${i + 1} of ${nn - mm + 1}: ${L.v(cur)}.next ← ${prev ? L.v(prev) : 'null (stitched later)'}.`, { m: mm, n: nn, flips: ++flips })
        prev = cur
        cur = nxt
        L.ptr('prev', prev).ptr('cur', cur)
        t.step('advance', `Advance. After the last flip, prev = old range tail (new range head), cur = first node after the range (${cur ? L.v(cur) : 'null'}).`, { m: mm, n: nn, flips })
      }
      L.clear().linkRole(anchor, 'swap')
      L.link(anchor, prev)
      t.step('stitchfront', `Stitch front: anchor.next ← ${L.v(prev)}. The front part of the list now enters the range at its new head.`, { m: mm, n: nn, flips })
      L.linkRole(rangeHead!, 'swap')
      L.link(rangeHead!, cur)
      t.step('stitchback', `Stitch back: the old range head (${L.v(rangeHead)}, now the range's tail).next ← ${cur ? L.v(cur) : 'null'}. Both cuts healed in two writes.`, { m: mm, n: nn, flips })
      const h = L.next(dummy)
      L.remove(dummy)
      L.setHead(h).ptr('anchor', undefined).ptr('prev', undefined).ptr('cur', undefined).clear().relayout()
      t.step('done', `Done in one pass: ${mm - 1} anchor hops + ${flips} flips + 2 stitches. No second list, no recursion.`, { m: mm, n: nn, flips })
    }),
}

/* ───────────────────────── 11. Middle with fast/slow pointers ───────────────────────── */

export const llMiddle: Algorithm = {
  id: 'll-middle',
  title: 'Middle of a list in one pass — fast and slow pointers',
  blurb: 'fast moves two nodes per step, slow one. When fast hits the end, slow is exactly at the middle — because distance(fast) = 2 × distance(slow) at every moment.',
  legend: { active: 'slow', compare: 'fast', done: 'middle found' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5 6 7 8 9 10', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(4, 10), 1, 9)) }),
  code: {
    pseudo: `
function middle(head)
  slow ← head; fast ← head                  // @init
  while fast ≠ null and fast.next ≠ null    // @loop
    slow ← slow.next                        // @slow
    fast ← fast.next.next                   // @fast
  return slow                               // @done`,
    cpp: `
ListNode* middle(ListNode* head) {
    ListNode *slow = head, *fast = head;     // @init
    while (fast && fast->next) {             // @loop
        slow = slow->next;                   // @slow
        fast = fast->next->next;             // @fast
    }
    return slow;                             // @done
}`,
    python: `
def middle(head):
    slow = fast = head             # @init
    while fast and fast.next:      # @loop
        slow = slow.next           # @slow
        fast = fast.next.next      # @fast
    return slow                    # @done`,
    java: `
ListNode middle(ListNode head) {
    ListNode slow = head, fast = head;       // @init
    while (fast != null && fast.next != null) {  // @loop
        slow = slow.next;                    // @slow
        fast = fast.next.next;               // @fast
    }
    return slow;                             // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', a, { label: 'list', showHead: false })
      let slow = L.head
      let fast: string | null = L.head
      L.ptr('slow', slow).ptr('fast', fast).role(slow!, 'active').role(fast!, 'compare')
      t.step('init', `Both start at the head. Invariant to watch: fast's index is always exactly twice slow's.`, { slowIdx: 0, fastIdx: 0, len: a.length })
      let si = 0
      let fi = 0
      while (fast && L.next(fast)) {
        slow = L.next(slow)
        si++
        L.ptr('slow', slow).clear().role(slow!, 'active')
        if (fast) L.role(fast, 'compare')
        t.step('slow', `slow → ${L.v(slow)} (index ${si}). One hop.`, { slowIdx: si, fastIdx: fi, len: a.length })
        fast = L.next(L.next(fast))
        fi += 2
        L.ptr('fast', fast)
        if (fast) L.role(fast, 'compare')
        t.step('fast', `fast → ${fast ? `${L.v(fast)} (index ${fi})` : 'null (off the end)'}. Two hops. Still twice slow's index: ${fi} = 2·${si}.`, { slowIdx: si, fastIdx: fi, len: a.length })
        L.clear().role(slow!, 'active')
        if (fast) L.role(fast, 'compare')
      }
      L.clear().role(slow!, 'done').ptr('fast', fast)
      const even = a.length % 2 === 0
      t.step('done', `fast can no longer double-step, so slow is the middle: ${L.v(slow)} (index ${si}) — the ${even ? 'second' : 'unique'} middle of ${a.length} nodes. Start fast = head.next instead and you get the first middle of an even list.`, { slowIdx: si, fastIdx: fi, len: a.length })
    }),
}

/* ───────────────────────── 12. Nth node from the end ───────────────────────── */

export const llNthFromEnd: Algorithm = {
  id: 'll-nth-from-end',
  title: 'Nth node from the end in one pass — the fixed-gap trick',
  blurb: 'Send first ahead by n nodes, then move both together. The gap never changes, so when first hits null, second sits exactly n from the end.',
  legend: { compare: 'first (ahead)', active: 'second', done: 'answer', window: 'the fixed gap of n' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '5 2 8 1 9 3 7 4 6 10 3 8', maxLen: 12 },
    { name: 'n', label: 'n from the end', type: 'number', default: '4', min: 1, max: 12 },
  ],
  random: () => {
    const len = rint(4, 10)
    return { arr: list(rarr(len, 1, 9)), n: String(rint(1, len)) }
  },
  code: {
    pseudo: `
function nthFromEnd(head, n)
  first ← head                              // @init
  move first n steps ahead                  // @gap
  second ← head                             // @second
  while first ≠ null                        // @loop
    first ← first.next; second ← second.next   // @slide
  return second                             // @done`,
    cpp: `
ListNode* nthFromEnd(ListNode* head, int n) {
    ListNode* first = head;                  // @init
    for (int i = 0; i < n; i++)              // @gap
        first = first->next;                 // @gap
    ListNode* second = head;                 // @second
    while (first) {                          // @loop
        first = first->next;                 // @slide
        second = second->next;               // @slide
    }
    return second;                           // @done
}`,
    python: `
def nth_from_end(head, n):
    first = head                   # @init
    for _ in range(n):             # @gap
        first = first.next         # @gap
    second = head                  # @second
    while first:                   # @loop
        first = first.next         # @slide
        second = second.next       # @slide
    return second                  # @done`,
    java: `
ListNode nthFromEnd(ListNode head, int n) {
    ListNode first = head;                   // @init
    for (int i = 0; i < n; i++)              // @gap
        first = first.next;                  // @gap
    ListNode second = head;                  // @second
    while (first != null) {                  // @loop
        first = first.next;                  // @slide
        second = second.next;                // @slide
    }
    return second;                           // @done
}`,
  },
  run: ({ arr, n }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const nn = nat(n, 'n', 1, a.length)
      const L = t.list('L', a, { label: 'list', showHead: false })
      let first: string | null = L.head
      L.ptr('first', first).role(first!, 'compare')
      t.step('init', `first starts at the head. Plan: open a gap of exactly ${nn} nodes, then slide both pointers until first falls off.`, { n: nn, gap: 0 })
      for (let i = 0; i < nn; i++) {
        first = L.next(first)
        L.ptr('first', first).clear().role(first!, 'compare')
        t.step('gap', `first advances ${i + 1} of ${nn} → ${first ? L.v(first) : 'null'}. The gap between the two future pointers is now ${i + 1}.`, { n: nn, gap: i + 1 })
      }
      let second = L.head
      L.ptr('second', second).role(second!, 'active')
      t.step('second', `second starts at the head, exactly ${nn} behind first. From here they move in lockstep, so the gap is invariant.`, { n: nn, gap: nn })
      while (first) {
        first = L.next(first)
        second = L.next(second)
        L.ptr('first', first).ptr('second', second).clear()
        L.role(second!, 'active')
        if (first) L.role(first, 'compare')
        t.step('slide', `Both advance: second = ${L.v(second)}, first = ${first ? L.v(first) : 'null'}. Gap still ${nn}.`, { n: nn, gap: nn })
      }
      L.clear().role(second!, 'done')
      t.step('done', `first = null means it stepped off the end — so second is exactly ${nn} nodes from the tail: value ${L.v(second)}. One pass, no length needed. (If first must not go null, stop at first.next = null and take second.next.)`, { n: nn, gap: nn, answer: L.v(second) as number })
    }),
}

/* ───────────────────────── 13. Floyd cycle detection ───────────────────────── */

export const llFloyd: Algorithm = {
  id: 'll-floyd',
  title: "Floyd's tortoise and hare — detect a cycle with two pointers",
  blurb: 'Inside a cycle, the hare gains one node per step on the tortoise, so the gap shrinks to 0: they must meet. No cycle means the hare hits null first.',
  legend: { active: 'slow (tortoise)', compare: 'fast (hare)', found: 'meeting point', done: 'no cycle' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '3 2 0 4 8 1 6 5 9 7', maxLen: 12 },
    { name: 'pos', label: 'Cycle starts at index (−1 = none)', type: 'number', default: '3', min: -1, max: 11 },
  ],
  random: () => {
    const len = rint(4, 9)
    return { arr: list(rarr(len, 1, 9)), pos: String(rint(-1, len - 2)) }
  },
  code: {
    pseudo: `
function hasCycle(head)
  slow ← head; fast ← head                     // @init
  while fast ≠ null and fast.next ≠ null       // @loop
    slow ← slow.next                           // @slow
    fast ← fast.next.next                      // @fast
    if slow = fast: return true                // @meet
  return false                                 // @none`,
    cpp: `
bool hasCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;       // @init
    while (fast && fast->next) {               // @loop
        slow = slow->next;                     // @slow
        fast = fast->next->next;               // @fast
        if (slow == fast) return true;         // @meet
    }
    return false;                              // @none
}`,
    python: `
def has_cycle(head):
    slow = fast = head               # @init
    while fast and fast.next:        # @loop
        slow = slow.next             # @slow
        fast = fast.next.next        # @fast
        if slow is fast: return True # @meet
    return False                     # @none`,
    java: `
boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;         // @init
    while (fast != null && fast.next != null) {    // @loop
        slow = slow.next;                      // @slow
        fast = fast.next.next;                 // @fast
        if (slow == fast) return true;         // @meet
    }
    return false;                              // @none
}`,
  },
  run: ({ arr, pos }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const p = nat(pos, 'pos', -1, a.length - 1)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const ids = L.ids()
      const cycleNode = p >= 0 ? ids[p] : null
      if (cycleNode) {
        const tail = ids[ids.length - 1]
        L.link(tail, cycleNode).linkRole(tail, 'new')
        t.step('init', `The tail points back at index ${p} (value ${L.v(cycleNode)}): a cycle of length ${a.length - p} after a stem of ${p}. slow and fast start together at the head.`, { slow: 0, fast: 0 })
      } else {
        t.step('init', `No cycle (pos = −1). Watch the hare reach null instead of meeting the tortoise.`, { slow: 0, fast: 0 })
      }
      let slow = L.head
      let fast: string | null = L.head
      L.ptr('slow', slow).ptr('fast', fast).role(slow!, 'active').role(fast!, 'compare')
      let si = 0
      let fi = 0
      while (fast && L.next(fast)) {
        slow = L.next(slow)
        si++
        L.ptr('slow', slow).clear().role(slow!, 'active')
        if (fast) L.role(fast, 'compare')
        t.step('slow', `Tortoise → ${L.v(slow)} (node #${si}).`, { slow: si, fast: fi })
        fast = L.next(L.next(fast))
        fi += 2
        L.ptr('fast', fast)
        if (fast) L.role(fast, 'compare')
        t.step('fast', `Hare → ${fast ? `${L.v(fast)} (node #${fi})` : 'null'}. Inside a cycle the hare closes the gap by exactly 1 per round, so it can never hop over the tortoise.`, { slow: si, fast: fi })
        if (fast === slow) {
          L.clear().role(slow!, 'found')
          t.step('meet', `They meet at ${L.v(slow)} after ${si} tortoise steps — a cycle exists. (The meeting point is generally NOT the cycle's start; the next animation finds that.)`, { slow: si, fast: fi })
          return
        }
        L.clear().role(slow!, 'active')
        if (fast) L.role(fast, 'compare')
      }
      L.clear().role(slow!, 'done')
      t.step('none', `The hare fell off the end (null): the list is acyclic. If a cycle existed, the hare would loop inside it forever and the gap argument guarantees a meeting.`, { slow: si, fast: fi })
    }),
}

/* ───────────────────────── 14. Cycle start — the distance proof in motion ───────────────────────── */

export const llCycleStart: Algorithm = {
  id: 'll-cycle-start',
  title: 'Find where the cycle begins — the L = C·k − m walk',
  blurb: 'After the meeting, send one pointer back to the head and walk both one step at a time. They meet exactly at the cycle entrance, because the stem length L ≡ −m (mod C).',
  legend: { found: 'meeting point', active: 'walker from head', compare: 'walker from meeting', done: 'cycle entrance' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '3 2 0 4 7 1 8 5 9 6', maxLen: 12 },
    { name: 'pos', label: 'Cycle starts at index', type: 'number', default: '4', min: 0, max: 11 },
  ],
  random: () => {
    const len = rint(4, 9)
    return { arr: list(rarr(len, 1, 9)), pos: String(rint(0, len - 2)) }
  },
  code: {
    pseudo: `
function cycleStart(head)
  m ← meeting point of Floyd's algorithm          // @meet
  p ← head; q ← m                                 // @reset
  while p ≠ q                                     // @loop
    p ← p.next; q ← q.next                        // @walk
  return p                                        // @done`,
    cpp: `
ListNode* cycleStart(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next; fast = fast->next->next;
        if (slow == fast) break;               // @meet
    }
    ListNode* p = head;                        // @reset
    ListNode* q = slow;                        // @reset
    while (p != q) {                           // @loop
        p = p->next; q = q->next;              // @walk
    }
    return p;                                  // @done
}`,
    python: `
def cycle_start(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
        if slow is fast: break               # @meet
    p, q = head, slow                        # @reset
    while p is not q:                        # @loop
        p = p.next; q = q.next               # @walk
    return p                                 # @done`,
    java: `
ListNode cycleStart(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next; fast = fast.next.next;
        if (slow == fast) break;             // @meet
    }
    ListNode p = head;                       // @reset
    ListNode q = slow;                       // @reset
    while (p != q) {                         // @loop
        p = p.next; q = q.next;              // @walk
    }
    return p;                                // @done
}`,
  },
  run: ({ arr, pos }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const p0 = nat(pos, 'pos', 0, a.length - 2)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const ids = L.ids()
      const entry = ids[p0]
      const tail = ids[ids.length - 1]
      L.link(tail, entry).linkRole(tail, 'new')
      const stem = p0
      const cycleLen = a.length - p0
      t.step('meet', `Cycle: stem L = ${stem}, cycle C = ${cycleLen}. Run Floyd first (previous animation) — the tortoise and hare meet somewhere in the cycle; here we replay just enough to find that meeting node M.`, { L: stem, C: cycleLen })
      // find the meeting point by simulation
      let slow: string | null = L.head
      let fast: string | null = L.head
      while (fast && L.next(fast)) {
        slow = L.next(slow)
        fast = L.next(L.next(fast))
        if (slow === fast) break
      }
      const meet = slow!
      L.clear().role(meet, 'found').ptr('q', meet)
      t.step('meet', `They meet at ${L.v(meet)}. The math: 2·d_slow = d_fast and both end m nodes into the cycle, so L + m ≡ 0 (mod C) — the head is exactly m·(−1) ≡ C − m steps from the entrance, and the meeting point is C − m steps from the entrance too.`, { L: stem, C: cycleLen })
      let p: string | null = L.head
      let q: string | null = meet
      L.ptr('p', p).role(p!, 'active').role(q!, 'compare')
      t.step('reset', `Send p to the head, keep q at the meeting point. Walk both ONE step per round. Both are now the same distance (C − m) from the entrance.`, { L: stem, C: cycleLen, steps: 0 })
      let steps = 0
      while (p !== q) {
        p = L.next(p)
        q = L.next(q)
        steps++
        L.ptr('p', p).ptr('q', q).clear().role(p!, 'active').role(q!, 'compare')
        t.step('walk', `Step ${steps}: p = ${L.v(p)}, q = ${L.v(q)}. Both stay the same distance from the entrance — if they enter the cycle, they enter it together, at the same node.`, { L: stem, C: cycleLen, steps })
      }
      L.clear().role(p!, 'done')
      t.step('done', `They collide at the entrance: ${L.v(p)} (index ${ids.indexOf(p!)}). Total: at most L + C steps twice — O(n) time, O(1) space, no visited-set.`, { L: stem, C: cycleLen, steps, entrance: ids.indexOf(p!) })
    }),
}

/* ───────────────────────── 15. Linked list palindrome ───────────────────────── */

export const llPalindrome: Algorithm = {
  id: 'll-palindrome',
  title: 'Is the list a palindrome? — middle, reverse half, compare',
  blurb: 'The O(1)-space classic: find the middle with fast/slow, reverse the second half, walk both halves in lockstep. Then (optionally) restore the list.',
  legend: { window: 'second half', swap: 'reversal flip', active: 'comparing', found: 'match', removed: 'mismatch' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5 6 5 4 3 2 1', maxLen: 12 }],
  random: () => {
    const h = rarr(rint(2, 5), 1, 5)
    const pal = [...h, ...[...h].reverse()]
    const arr = Math.random() < 0.5 ? pal : [...h, ...rarr(rint(2, 5), 1, 5)]
    return { arr: list(arr.slice(0, 10)) }
  },
  code: {
    pseudo: `
function isPalindrome(head)
  find middle with fast/slow                    // @middle
  second ← reverse(middle.next)                 // @reverse
  p ← head; q ← second                          // @init
  while q ≠ null                                // @loop
    if p.value ≠ q.value: return false          // @cmp
    p ← p.next; q ← q.next                      // @slide
  return true                                   // @done`,
    cpp: `
bool isPalindrome(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast->next && fast->next->next) {     // @middle
        slow = slow->next; fast = fast->next->next;  // @middle
    }
    ListNode* second = reverse(slow->next);      // @reverse
    ListNode *p = head, *q = second;             // @init
    while (q) {                                  // @loop
        if (p->val != q->val) return false;      // @cmp
        p = p->next; q = q->next;                // @slide
    }
    return true;                                 // @done
}`,
    python: `
def is_palindrome(head):
    slow = fast = head
    while fast.next and fast.next.next:          # @middle
        slow = slow.next; fast = fast.next.next  # @middle
    second = reverse(slow.next)                  # @reverse
    p, q = head, second                          # @init
    while q:                                     # @loop
        if p.val != q.val: return False          # @cmp
        p = p.next; q = q.next                   # @slide
    return True                                  # @done`,
    java: `
boolean isPalindrome(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {  // @middle
        slow = slow.next; fast = fast.next.next;           // @middle
    }
    ListNode second = reverse(slow.next);        // @reverse
    ListNode p = head, q = second;               // @init
    while (q != null) {                          // @loop
        if (p.val != q.val) return false;        // @cmp
        p = p.next; q = q.next;                  // @slide
    }
    return true;                                 // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      if (a.length < 2) throw new Error('Give at least two values.')
      const L = t.list('L', a, { label: 'list', showHead: false })
      // find middle (slow ends at floor((n-1)/2), the node BEFORE the second half)
      let slow = L.head!
      let fast = L.head!
      L.ptr('slow', slow).ptr('fast', fast)
      while (L.next(fast) && L.next(L.next(fast))) {
        slow = L.next(slow)!
        fast = L.next(L.next(fast))!
        L.ptr('slow', slow).ptr('fast', fast)
      }
      L.clear().role(slow, 'active')
      const secondStart = L.next(slow)!
      const halfIds = L.ids(secondStart)
      halfIds.forEach((id) => L.role(id, 'window'))
      t.step('middle', `fast/slow with the fast.next && fast.next.next guard leaves slow at ${L.v(slow)} — the node just before the second half (${L.v(secondStart)} …). Splitting here gives halves of size ⌊n/2⌋ and ⌈n/2⌉.`, { n: a.length, half: Math.floor(a.length / 2) })
      // reverse the second half in place, animated compactly
      let prev: string | null = null
      let cur: string | null = secondStart
      let flips = 0
      while (cur) {
        const nxt = L.next(cur)
        L.clear().role(cur, 'active')
        L.link(cur, prev).linkRole(cur, 'swap')
        flips++
        t.step('reverse', `Reverse the second half: flip ${L.v(cur)}.next ← ${prev ? L.v(prev) : 'null'} (${flips} flips so far). Each flipped node will be visited once from the back.`, { n: a.length, half: Math.floor(a.length / 2), flips })
        prev = cur
        cur = nxt
      }
      const secondHead = prev!
      let p: string | null = L.head
      let q: string | null = secondHead
      L.ptr('p', p).ptr('q', q).clear().role(p!, 'active').role(q!, 'active')
      t.step('init', `Second half now runs backwards from ${L.v(q)}. p walks the front forwards, q walks the back "forwards" (which is the original backwards). Compare in lockstep — the shorter half decides when to stop.`, { n: a.length, half: Math.floor(a.length / 2), flips })
      let i = 0
      while (q) {
        L.clear().role(p!, 'active').role(q!, 'active')
        if ((L.v(p) as number) !== (L.v(q) as number)) {
          L.role(p!, 'removed').role(q!, 'removed')
          t.step('cmp', `${L.v(p)} ≠ ${L.v(q)} at pair ${i + 1}: not a palindrome.`, { n: a.length, half: Math.floor(a.length / 2), flips })
          L.ptr('p', undefined).ptr('q', undefined)
          return
        }
        L.role(p!, 'found').role(q!, 'found')
        t.step('cmp', `${L.v(p)} = ${L.v(q)} at pair ${i + 1} — mirror positions match.`, { n: a.length, half: Math.floor(a.length / 2), flips })
        p = L.next(p)
        q = L.next(q)
        i++
        L.ptr('p', p).ptr('q', q)
      }
      L.clear().ptr('p', undefined).ptr('q', undefined)
      L.ids().forEach((id) => L.role(id, 'done'))
      t.step('done', `q fell off its (shorter or equal) half first with every pair matching: palindrome. O(n) time, O(1) space — unlike copying to an array. Restore the list afterwards by reversing the half back if the caller needs it intact.`, { n: a.length, half: Math.floor(a.length / 2), flips })
    }),
}

/* ───────────────────────── 16. Naive vs one-pass contrasts ───────────────────────── */

export const llNaiveLength: Algorithm = {
  id: 'll-two-pass-vs-one',
  title: 'Two passes vs one — why the gap trick wins',
  blurb: 'The textbook way to reach the nth-from-end node: pass 1 counts the length, pass 2 walks length−n nodes. The fixed-gap way does it in a single walk. Count the node visits in both.',
  legend: { active: 'node being visited', done: 'visited in pass 1', found: 'answer', compare: 'first pointer', window: 'gap' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '6 1 4 8 2 9 5 3 7 4 1', maxLen: 12 },
    { name: 'n', label: 'n from the end', type: 'number', default: '4', min: 1, max: 12 },
  ],
  random: () => {
    const len = rint(5, 10)
    return { arr: list(rarr(len, 1, 9)), n: String(rint(1, len)) }
  },
  code: {
    pseudo: `
function nthTwoPass(head, n)
  len ← 0; cur ← head                      // @count
  while cur ≠ null: len++; cur ← cur.next  // @count
  cur ← head                               // @restart
  walk len − n − 1 steps                   // @walk2
  return cur                               // @done`,
    cpp: `
ListNode* nthTwoPass(ListNode* head, int n) {
    int len = 0; ListNode* cur = head;     // @count
    while (cur) { len++; cur = cur->next; }    // @count
    cur = head;                            // @restart
    for (int i = 0; i < len - n; i++)      // @walk2
        cur = cur->next;                   // @walk2
    return cur;                            // @done
}`,
    python: `
def nth_two_pass(head, n):
    length, cur = 0, head                # @count
    while cur:                           # @count
        length += 1; cur = cur.next      # @count
    cur = head                           # @restart
    for _ in range(length - n):          # @walk2
        cur = cur.next                   # @walk2
    return cur                           # @done`,
    java: `
ListNode nthTwoPass(ListNode head, int n) {
    int len = 0; ListNode cur = head;    // @count
    while (cur != null) { len++; cur = cur.next; }   // @count
    cur = head;                          // @restart
    for (int i = 0; i < len - n; i++)    // @walk2
        cur = cur.next;                  // @walk2
    return cur;                          // @done
}`,
  },
  run: ({ arr, n }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const nn = nat(n, 'n', 1, a.length)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const M = t.meter('m', 'node visits (two-pass)', [{ label: 'n', value: a.length }, { label: '2n', value: 2 * a.length }])
      let cur = L.head
      let len = 0
      L.ptr('cur', cur).role(cur!, 'active')
      t.step('count', `Pass 1: count the length. Every node must be touched — a list has no size until you pay for it.`, { pass: 1, len: 0, visits: 0 })
      while (cur) {
        len++
        M.add()
        L.role(cur!, 'done')
        t.step('count', `Visit ${L.v(cur)}: len = ${len}.`, { pass: 1, len, visits: len })
        cur = L.next(cur)
        L.ptr('cur', cur)
        if (cur) {
          L.clear()
          L.ids().slice(0, len).forEach((id) => L.role(id, 'done'))
          L.role(cur, 'active')
        }
      }
      cur = L.head
      L.ptr('cur', cur).clear()
      L.ids().forEach((id) => L.role(id, 'done'))
      L.role(cur!, 'active')
      t.step('restart', `Pass 2 begins from the head again — that re-walk is the waste. Target index: len − n = ${len} − ${nn} = ${len - nn}.`, { pass: 2, len, visits: len })
      let visits = len
      for (let i = 0; i < len - nn; i++) {
        cur = L.next(cur)
        visits++
        M.add()
        L.ptr('cur', cur).clear()
        L.role(cur!, 'active')
        t.step('walk2', `Step ${i + 1} of ${len - nn}: now at ${L.v(cur)}.`, { pass: 2, len, visits })
      }
      L.clear().role(cur!, 'found')
      t.step('done', `Answer ${L.v(cur)} after ${visits} visits ≈ 2n − ${nn}. The one-pass gap trick (ll-nth-from-end) touches each node at most twice too, but streams — it never needs the length, which matters when the list is a stream you can only read once.`, { pass: 2, len, visits })
    }),
}

export const algorithms2 = [llReverseIter, llReverseRec, llReverseRange, llMiddle, llNthFromEnd, llFloyd, llCycleStart, llPalindrome, llNaiveLength]
