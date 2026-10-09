import { trace } from '../../../engine/tracer'
import type { Algorithm } from '../../../engine/types'
import { list, rarr, rint } from '../../../algorithms/util'

/* Linked lists — animations, quarter 3: merging, merge sort, intersection, swapping, k-groups. */

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

/* ───────────────────────── 17. Merge two sorted lists ───────────────────────── */

export const llMergeSorted: Algorithm = {
  id: 'll-merge-sorted',
  title: 'Merge two sorted lists — the tail pointer pattern',
  blurb: 'A dummy owns the result; a tail pointer marks where the next winner is stitched on. No new nodes: the original nodes are relinked, one comparison at a time.',
  legend: { compare: 'the two candidates', new: 'node just stitched', best: 'tail of the result', done: 'merged' },
  inputs: [
    { name: 'a', label: 'List A (sorted)', type: 'array', default: '1 4 7 9 12 15', maxLen: 8 },
    { name: 'b', label: 'List B (sorted)', type: 'array', default: '2 3 8 10 14', maxLen: 8 },
  ],
  random: () => ({
    a: list([...rarr(rint(3, 6), 1, 20)].sort((x, y) => x - y)),
    b: list([...rarr(rint(2, 5), 1, 20)].sort((x, y) => x - y)),
  }),
  code: {
    pseudo: `
function merge(a, b)
  dummy ← Node(0); tail ← dummy                 // @init
  while a ≠ null and b ≠ null                   // @loop
    if a.value ≤ b.value                        // @cmp
      tail.next ← a; a ← a.next                 // @takea
    else tail.next ← b; b ← b.next              // @takeb
    tail ← tail.next                            // @advance
  tail.next ← (a if a ≠ null else b)            // @rest
  return dummy.next                             // @done`,
    cpp: `
ListNode* merge(ListNode* a, ListNode* b) {
    ListNode dummy(0); ListNode* tail = &dummy;   // @init
    while (a && b) {                              // @loop
        if (a->val <= b->val) {                   // @cmp
            tail->next = a; a = a->next;          // @takea
        } else {                                  // @cmp
            tail->next = b; b = b->next;          // @takeb
        }
        tail = tail->next;                        // @advance
    }
    tail->next = a ? a : b;                       // @rest
    return dummy.next;                            // @done
}`,
    python: `
def merge(a, b):
    dummy = Node(0); tail = dummy         # @init
    while a and b:                        # @loop
        if a.val <= b.val:                # @cmp
            tail.next = a; a = a.next     # @takea
        else:                             # @cmp
            tail.next = b; b = b.next     # @takeb
        tail = tail.next                  # @advance
    tail.next = a if a else b             # @rest
    return dummy.next                     # @done`,
    java: `
ListNode merge(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;  // @init
    while (a != null && b != null) {                 // @loop
        if (a.val <= b.val) {                        // @cmp
            tail.next = a; a = a.next;               // @takea
        } else {                                     // @cmp
            tail.next = b; b = b.next;               // @takeb
        }
        tail = tail.next;                            // @advance
    }
    tail.next = (a != null) ? a : b;                 // @rest
    return dummy.next;                               // @done
}`,
  },
  run: ({ a, b }) =>
    trace((t) => {
      const av = vals(a, 'List A', -99, 999).sort((x, y) => x - y)
      const bv = vals(b, 'List B', -99, 999).sort((x, y) => x - y)
      const A = t.list('A', av, { label: 'list A', showHead: false })
      const B = t.list('B', bv, { label: 'list B', showHead: false })
      const R = t.list('R', [], { label: 'result', showHead: false })
      const dummy = R.add(0)
      R.setHead(dummy).role(dummy, 'dim').ptr('tail', dummy)
      let pa = A.head
      let pb = B.head
      A.ptr('a', pa)
      B.ptr('b', pb)
      if (pa) A.role(pa, 'compare')
      if (pb) B.role(pb, 'compare')
      t.step('init', `The result starts as just a dummy node; tail points at its last node. Compare the heads: ${A.v(pa)} vs ${B.v(pb)}.`, { cmps: 0 })
      let cmps = 0
      const stitched: string[] = []
      const take = (from: 'A' | 'B') => {
        const src = from === 'A' ? A : B
        const node = from === 'A' ? pa! : pb!
        const v = src.v(node)
        const copy = R.add(v as number)
        stitched.push(copy)
        const tail = stitched.length > 1 ? stitched[stitched.length - 2] : dummy
        R.link(tail, copy).clear().role(copy, 'new').linkRole(tail, 'swap')
        R.ptr('tail', copy)
        t.step(from === 'A' ? 'takea' : 'takeb', `${v} wins — stitch it onto the result's tail. (The real algorithm relinks the ORIGINAL node; we copy it here so both lists stay visible.)`, { cmps, taken: from === 'A' ? 'A' : 'B', value: v as number })
        if (from === 'A') {
          pa = A.next(pa)
          A.ptr('a', pa)
        } else {
          pb = B.next(pb)
          B.ptr('b', pb)
        }
        R.clear()
        stitched.forEach((id) => R.role(id, 'done'))
        R.role(copy, 'new')
      }
      while (pa && pb) {
        A.clear().role(pa, 'compare')
        B.clear().role(pb, 'compare')
        cmps++
        t.step('loop', `Compare heads: ${A.v(pa)} vs ${B.v(pb)}.`, { cmps })
        if ((A.v(pa) as number) <= (B.v(pb) as number)) {
          t.step('cmp', `${A.v(pa)} ≤ ${B.v(pb)}: A's head goes next. (Ties go to A — that choice makes the merge STABLE.)`, { cmps })
          take('A')
        } else {
          t.step('cmp', `${A.v(pa)} > ${B.v(pb)}: B's head goes next.`, { cmps })
          take('B')
        }
        if (pa) A.role(pa, 'compare')
        if (pb) B.role(pb, 'compare')
      }
      const winner = pa ? 'A' : pb ? 'B' : null
      const rest = pa ? A.values(pa) : pb ? B.values(pb) : []
      for (const v of rest) {
        const copy = R.add(v as number)
        stitched.push(copy)
        R.link(stitched[stitched.length - 2], copy).role(copy, 'new')
        R.ptr('tail', copy)
      }
      R.clear()
      stitched.forEach((id) => R.role(id, 'done'))
      t.step('rest', `One list ran out first (${winner ?? 'both at once'}): attach whatever remains of ${winner ?? 'either'} in one write — it is already sorted. ${rest.length ? `Remaining: ${rest.join(' ')}.` : 'Nothing remains.'}`, { cmps })
      R.remove(dummy)
      R.setHead(stitched[0] ?? null).ptr('tail', undefined).relayout()
      t.step('done', `Merged: ${R.values().join(' ')}. ${cmps} comparisons for ${av.length + bv.length} nodes — at most one comparison per output node, so O(n + m) time, O(1) extra space.`, { cmps, out: av.length + bv.length })
    }),
}

/* ───────────────────────── 18. Merge sort on a linked list ───────────────────────── */

export const llMergeSort: Algorithm = {
  id: 'll-merge-sort',
  title: 'Merge sort on a linked list — the sort that lists do better than arrays',
  blurb: 'Split at the middle with fast/slow, sort both halves recursively, merge. No random access is ever needed — which is exactly why merge sort is THE list sort (and why Linux uses it for its lists).',
  legend: { active: 'half being processed', compare: 'comparing heads', new: 'stitched onto result', done: 'sorted half', window: 'current recursion' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '5 2 8 1 9 3 7 4 11 6', maxLen: 10 }],
  random: () => ({ arr: list(rarr(rint(5, 9), 1, 20)) }),
  code: {
    pseudo: `
function mergeSort(head)
  if head = null or head.next = null: return head     // @base
  slow ← middle-before-split; second ← slow.next      // @split
  slow.next ← null                                    // @cut
  left ← mergeSort(head)                              // @sortleft
  right ← mergeSort(second)                           // @sortright
  return merge(left, right)                           // @merge`,
    cpp: `
ListNode* mergeSort(ListNode* head) {
    if (!head || !head->next) return head;        // @base
    ListNode *slow = head, *fast = head->next;
    while (fast && fast->next) {                  // @split
        slow = slow->next; fast = fast->next->next;   // @split
    }
    ListNode* second = slow->next;                // @split
    slow->next = nullptr;                         // @cut
    ListNode* left = mergeSort(head);             // @sortleft
    ListNode* right = mergeSort(second);          // @sortright
    return merge(left, right);                    // @merge
}`,
    python: `
def merge_sort(head):
    if not head or not head.next: return head        # @base
    slow, fast = head, head.next
    while fast and fast.next:                        # @split
        slow = slow.next; fast = fast.next.next      # @split
    second = slow.next                               # @split
    slow.next = None                                 # @cut
    left = merge_sort(head)                          # @sortleft
    right = merge_sort(second)                       # @sortright
    return merge(left, right)                        # @merge`,
    java: `
ListNode mergeSort(ListNode head) {
    if (head == null || head.next == null) return head;   // @base
    ListNode slow = head, fast = head.next;
    while (fast != null && fast.next != null) {           // @split
        slow = slow.next; fast = fast.next.next;          // @split
    }
    ListNode second = slow.next;                     // @split
    slow.next = null;                                // @cut
    ListNode left = mergeSort(head);                 // @sortleft
    ListNode right = mergeSort(second);              // @sortright
    return merge(left, right);                       // @merge
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', a, { label: 'working list', showHead: false })
      const S = t.stack('cs', 'recursion stack')
      let merges = 0
      const sort = (head: string | null, depth: number): string | null => {
        if (!head) return null
        if (!L.next(head)) {
          L.clear().role(head, 'done')
          t.step('base', `${'  '.repeat(depth)}Single node ${L.v(head)}: already sorted.`, { depth })
          return head
        }
        const chunk = L.ids(head)
        L.clear()
        chunk.forEach((id) => L.role(id, 'window'))
        S.push(`sort[${L.values(head).join(',')}]`)
        t.step('split', `${'  '.repeat(depth)}Sort [${L.values(head).join(' ')}]: find the middle with fast/slow to split into halves.`, { depth })
        let slow = head
        let fast: string | null = L.next(head)
        while (fast && L.next(fast)) {
          slow = L.next(slow)!
          fast = L.next(L.next(fast))
        }
        const second = L.next(slow)!
        L.role(slow, 'active').role(second, 'compare')
        t.step('split', `${'  '.repeat(depth)}slow stops at ${L.v(slow)}; the second half starts at ${L.v(second)}.`, { depth })
        L.link(slow, null).linkRole(slow, 'swap')
        t.step('cut', `${'  '.repeat(depth)}Cut: ${L.v(slow)}.next ← null. Two independent lists now — this is the only "write" the split needs.`, { depth })
        t.step('sortleft', `${'  '.repeat(depth)}Recurse on the left half [${L.values(head).join(' ')}].`, { depth })
        const left = sort(head, depth + 1)
        t.step('sortright', `${'  '.repeat(depth)}Recurse on the right half [${L.values(second).join(' ')}].`, { depth })
        const right = sort(second, depth + 1)
        // merge left and right, reusing nodes
        L.clear()
        let pa = left
        let pb = right
        let tail: string | null = null
        let newHead: string | null = null
        while (pa && pb) {
          L.role(pa, 'compare').role(pb, 'compare')
          if ((L.v(pa) as number) <= (L.v(pb) as number)) {
            t.step('merge', `${'  '.repeat(depth)}Merge: ${L.v(pa)} ≤ ${L.v(pb)} — take ${L.v(pa)}.`, { depth })
            if (!tail) newHead = pa
            else L.link(tail, pa)
            tail = pa
            pa = L.next(pa)
          } else {
            t.step('merge', `${'  '.repeat(depth)}Merge: ${L.v(pa)} > ${L.v(pb)} — take ${L.v(pb)}.`, { depth })
            if (!tail) newHead = pb
            else L.link(tail, pb)
            tail = pb
            pb = L.next(pb)
          }
        }
        const rest = pa ?? pb
        if (tail) L.link(tail, rest)
        if (!tail) newHead = rest
        merges++
        L.clear()
        L.ids(newHead).forEach((id) => L.role(id, 'done'))
        S.pop()
        t.step('merge', `${'  '.repeat(depth)}Merged: [${L.values(newHead).join(' ')}]. One level done — ${merges} merges so far.`, { depth })
        return newHead
      }
      const sorted = sort(L.head, 0)
      L.setHead(sorted).clear().relayout()
      L.ids().forEach((id) => L.role(id, 'done'))
      t.step('merge', `Sorted: [${L.values().join(' ')}]. Recurrence T(n) = 2T(n/2) + O(n) ⇒ O(n log n); the O(n) merge never indexes, only relinks — O(1) space beyond the O(log n) recursion stack.`, { depth: 0 })
    }),
}

/* ───────────────────────── 19. Intersection of two lists ───────────────────────── */

export const llIntersection: Algorithm = {
  id: 'll-intersection',
  title: 'Intersection node — the switch-partners trick',
  blurb: 'p walks A then B; q walks B then A. Both travel a + c + b nodes, so they arrive at the shared node together — or both hit null together when there is no intersection.',
  legend: { active: 'p', compare: 'q', found: 'intersection', done: 'no intersection', window: 'shared tail' },
  inputs: [
    { name: 'a', label: 'A-only values', type: 'array', default: '4 1 7 2', maxLen: 6 },
    { name: 'b', label: 'B-only values', type: 'array', default: '5 6', maxLen: 6 },
    { name: 'c', label: 'Shared tail (empty = none)', type: 'string', default: '8 4 5 9' },
  ],
  random: () => {
    const shared = Math.random() < 0.75 ? rarr(rint(1, 3), 1, 9) : []
    return { a: list(rarr(rint(1, 4), 1, 9)), b: list(rarr(rint(1, 4), 1, 9)), c: list(shared) }
  },
  code: {
    pseudo: `
function intersect(headA, headB)
  p ← headA; q ← headB                          // @init
  while p ≠ q                                   // @loop
    p ← (p = null) ? headB : p.next             // @step
    q ← (q = null) ? headA : q.next             // @step
  return p   # shared node, or null             // @done`,
    cpp: `
ListNode* intersect(ListNode* headA, ListNode* headB) {
    ListNode *p = headA, *q = headB;             // @init
    while (p != q) {                             // @loop
        p = p ? p->next : headB;                 // @step
        q = q ? q->next : headA;                 // @step
    }
    return p;                                    // @done
}`,
    python: `
def intersect(head_a, head_b):
    p, q = head_a, head_b              # @init
    while p is not q:                  # @loop
        p = head_b if p is None else p.next    # @step
        q = head_a if q is None else q.next    # @step
    return p                           # @done`,
    java: `
ListNode intersect(ListNode headA, ListNode headB) {
    ListNode p = headA, q = headB;               // @init
    while (p != q) {                             // @loop
        p = (p == null) ? headB : p.next;        // @step
        q = (q == null) ? headA : q.next;        // @step
    }
    return p;                                    // @done
}`,
  },
  run: ({ a, b, c }) =>
    trace((t) => {
      const av = String(a)
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
      const bv = String(b)
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
      const cv = String(c)
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
      for (const v of [...av, ...bv, ...cv]) if (!Number.isInteger(v)) throw new Error('All values must be whole numbers.')
      const L = t.list('L', [], { label: 'the two lists', showHead: false })
      // build shared tail first
      const sharedIds: string[] = []
      for (const v of cv) sharedIds.push(L.add(v))
      sharedIds.forEach((id, i) => L.link(id, sharedIds[i + 1] ?? null))
      const aIds = av.map((v) => L.add(v))
      const bIds = bv.map((v) => L.add(v))
      aIds.forEach((id, i) => L.link(id, aIds[i + 1] ?? sharedIds[0] ?? null))
      bIds.forEach((id, i) => L.link(id, bIds[i + 1] ?? sharedIds[0] ?? null))
      const headA = aIds[0] ?? sharedIds[0] ?? null
      const headB = bIds[0] ?? sharedIds[0] ?? null
      if (!headA || !headB) throw new Error('Both lists must be non-empty.')
      L.setHead(headA)
      sharedIds.forEach((id) => L.role(id, 'window'))
      t.step('init', `List A: ${av.length} own nodes; list B: ${bv.length} own nodes; shared tail: ${cv.length} (highlighted). Lengths differ, so walking in lockstep from the heads never lines up — that is the difficulty.`, { aLen: av.length, bLen: bv.length, shared: cv.length })
      let p: string | null = headA
      let q: string | null = headB
      L.ptr('p', p).ptr('q', q).role(p, 'active').role(q, 'compare')
      let steps = 0
      while (p !== q) {
        if (steps > 60) throw new Error('Too long — use shorter lists.')
        p = p ? L.next(p) : headB
        q = q ? L.next(q) : headA
        steps++
        L.ptr('p', p).ptr('q', q).clear()
        sharedIds.forEach((id) => L.role(id, 'window'))
        if (p) L.role(p, 'active')
        if (q) L.role(q, 'compare')
        const note = (who: string, id: string | null, own: string, other: string) =>
          id ? `${who} → ${L.v(id)}` : `${who} hit the end and switched to ${other}'s head (${L.v(own)}) — the switch is what cancels the length difference`
        t.step('loop', `Step ${steps}: ${note('p', p, headB, 'A')} | ${note('q', q, headA, 'B')}. p's full route is a+c then b+c; q's is b+c then a+c — equal totals, so they meet inside the shared tail (or both end at null).`, { aLen: av.length, bLen: bv.length, shared: cv.length, steps })
      }
      L.clear()
      sharedIds.forEach((id) => L.role(id, 'window'))
      if (p) {
        L.role(p, 'found')
        t.step('done', `p = q at ${L.v(p)} — the intersection node. Both pointers travelled a + c + b + c and c nodes overlap, so they arrive together.`, { aLen: av.length, bLen: bv.length, shared: cv.length, steps })
      } else {
        t.step('done', `p = q = null: both fell off the ends together after a + b nodes each — no intersection. The same loop answers "no" without any special case.`, { aLen: av.length, bLen: bv.length, shared: cv.length, steps })
      }
    }),
}

/* ───────────────────────── 20. Union & intersection of value sets (dedupe) ───────────────────────── */

export const llUnionDedupe: Algorithm = {
  id: 'll-union-dedupe',
  title: 'Remove duplicates from an unsorted list — seen-set vs nested walk',
  blurb: 'The naive way compares every node with every earlier node: O(n²). A hash set of seen values does it in O(n). Watch the visit counter in both.',
  legend: { active: 'node being examined', removed: 'duplicate being unlinked', done: 'kept', compare: 'naive inner-loop comparison' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '4 2 4 7 2 9 4 1 7 2 5', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(6, 10), 1, 6)) }),
  code: {
    pseudo: `
function dedupe(head)                 # hash-set version, O(n)
  seen ← ∅; dummy ← Node(0); dummy.next ← head; prev ← dummy    // @init
  while prev.next ≠ null                                         // @loop
    if prev.next.value ∈ seen                                    // @seen
      prev.next ← prev.next.next                                 // @drop
    else seen.add(prev.next.value); prev ← prev.next             // @keep
  return dummy.next                                              // @done`,
    cpp: `
ListNode* dedupe(ListNode* head) {
    unordered_set<int> seen;                          // @init
    ListNode dummy(0); dummy.next = head;             // @init
    ListNode* prev = &dummy;
    while (prev->next) {                              // @loop
        if (seen.count(prev->next->val))              // @seen
            prev->next = prev->next->next;            // @drop
        else {                                        // @seen
            seen.insert(prev->next->val);             // @keep
            prev = prev->next;                        // @keep
        }
    }
    return dummy.next;                                // @done
}`,
    python: `
def dedupe(head):
    seen = set()                              # @init
    dummy = Node(0); dummy.next = head        # @init
    prev = dummy
    while prev.next:                          # @loop
        if prev.next.val in seen:             # @seen
            prev.next = prev.next.next        # @drop
        else:                                 # @seen
            seen.add(prev.next.val)           # @keep
            prev = prev.next                  # @keep
    return dummy.next                         # @done`,
    java: `
ListNode dedupe(ListNode head) {
    HashSet<Integer> seen = new HashSet<>();          // @init
    ListNode dummy = new ListNode(0); dummy.next = head;  // @init
    ListNode prev = dummy;
    while (prev.next != null) {                       // @loop
        if (seen.contains(prev.next.val))             // @seen
            prev.next = prev.next.next;               // @drop
        else {                                        // @seen
            seen.add(prev.next.val);                  // @keep
            prev = prev.next;                         // @keep
        }
    }
    return dummy.next;                                // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const M = t.meter('m', 'work units', [{ label: 'n', value: a.length }, { label: 'n²', value: a.length * a.length }])
      const realHead = L.head
      const dummy = L.add(0, 0)
      L.link(dummy, realHead).setHead(dummy).role(dummy, 'dim')
      const seen = new Set<number>()
      let prev = dummy
      let naiveWork = 0
      // count what the naive O(n^2) method would have paid, up front, for contrast
      for (let i = 0; i < a.length; i++) naiveWork += i
      L.ptr('prev', prev)
      t.step('init', `A set "seen" (empty) and a dummy head. The naive alternative would compare node i with all i earlier nodes — ${naiveWork} comparisons total, the n² bar on the meter.`, { seen: '{}', naive: naiveWork })
      M.add(a.length)
      while (L.next(prev)) {
        const cand = L.next(prev)!
        const v = L.v(cand) as number
        L.clear().role(dummy, 'dim').role(prev, 'done').role(cand, 'active')
        t.step('loop', `Examine ${v}. One set lookup decides everything.`, { seen: `{${[...seen].join(',')}}`, naive: naiveWork })
        if (seen.has(v)) {
          t.step('seen', `${v} is already in seen — duplicate.`, { seen: `{${[...seen].join(',')}}`, naive: naiveWork })
          L.link(prev, L.next(cand)).linkRole(prev, 'swap').role(cand, 'removed')
          t.step('drop', `Unlink it: prev.next jumps over. prev stays put.`, { seen: `{${[...seen].join(',')}}`, naive: naiveWork })
          L.remove(cand)
          L.clear().role(dummy, 'dim').role(prev, 'done')
        } else {
          seen.add(v)
          t.step('seen', `${v} is new — one set insert.`, { seen: `{${[...seen].join(',')}}`, naive: naiveWork })
          prev = cand
          L.ptr('prev', prev).role(prev, 'done')
          t.step('keep', `Keep it; prev advances.`, { seen: `{${[...seen].join(',')}}`, naive: naiveWork })
        }
      }
      const h = L.next(dummy)
      L.remove(dummy)
      L.setHead(h).ptr('prev', undefined).clear().relayout()
      L.ids().forEach((id) => L.role(id, 'done'))
      t.step('done', `Distinct values, first occurrences kept: [${L.values().join(' ')}]. Cost: ${a.length} lookups ≈ the n bar — versus ${naiveWork} nested comparisons without the set. That gap is why "use a hash set" is the standard follow-up.`, { seen: `{${[...seen].join(',')}}`, naive: naiveWork })
    }),
}

/* ───────────────────────── 21. Swap nodes in pairs ───────────────────────── */

export const llSwapPairs: Algorithm = {
  id: 'll-swap-pairs',
  title: 'Swap nodes in pairs — relinking, not value-swapping',
  blurb: 'Interviewers usually mean move the NODES (follow-up: "what if nodes carry satellite data?"). Four pointer writes per pair, with a dummy head and a prev anchor.',
  legend: { compare: 'the pair', swap: 'pointer being rewritten', new: 'pair in final position', dim: 'anchor' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(4, 9), 1, 9)) }),
  code: {
    pseudo: `
function swapPairs(head)
  dummy ← Node(0); dummy.next ← head; prev ← dummy       // @init
  while prev.next ≠ null and prev.next.next ≠ null       // @loop
    a ← prev.next; b ← a.next                            // @grab
    a.next ← b.next                                      // @w1
    b.next ← a                                           // @w2
    prev.next ← b                                        // @w3
    prev ← a                                             // @advance
  return dummy.next                                      // @done`,
    cpp: `
ListNode* swapPairs(ListNode* head) {
    ListNode dummy(0); dummy.next = head;                 // @init
    ListNode* prev = &dummy;
    while (prev->next && prev->next->next) {              // @loop
        ListNode *a = prev->next, *b = a->next;           // @grab
        a->next = b->next;                                // @w1
        b->next = a;                                      // @w2
        prev->next = b;                                   // @w3
        prev = a;                                         // @advance
    }
    return dummy.next;                                    // @done
}`,
    python: `
def swap_pairs(head):
    dummy = Node(0); dummy.next = head            # @init
    prev = dummy
    while prev.next and prev.next.next:           # @loop
        a = prev.next; b = a.next                 # @grab
        a.next = b.next                           # @w1
        b.next = a                                # @w2
        prev.next = b                             # @w3
        prev = a                                  # @advance
    return dummy.next                             # @done`,
    java: `
ListNode swapPairs(ListNode head) {
    ListNode dummy = new ListNode(0); dummy.next = head;  // @init
    ListNode prev = dummy;
    while (prev.next != null && prev.next.next != null) {     // @loop
        ListNode a = prev.next, b = a.next;               // @grab
        a.next = b.next;                                  // @w1
        b.next = a;                                       // @w2
        prev.next = b;                                    // @w3
        prev = a;                                         // @advance
    }
    return dummy.next;                                    // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const realHead = L.head
      const dummy = L.add(0, 0)
      L.link(dummy, realHead).setHead(dummy).role(dummy, 'dim')
      let prev = dummy
      L.ptr('prev', prev)
      t.step('init', `Dummy + prev anchor. Each round handles the pair right after prev; the odd tail node (if any) is never touched.`, { pairs: 0 })
      let pairs = 0
      while (L.next(prev) && L.next(L.next(prev))) {
        const A = L.next(prev)!
        const B = L.next(A)!
        L.clear().role(dummy, 'dim').role(prev, 'dim').role(A, 'compare').role(B, 'compare')
        t.step('loop', `Pair: a = ${L.v(A)}, b = ${L.v(B)}. Goal: prev → b → a → (rest).`, { pairs })
        t.step('grab', `Name them: a = ${L.v(A)}, b = ${B ? L.v(B) : 'null'}. Three incoming/outgoing links involve the pair: prev→a, a→b, b→rest.`, { pairs })
        const rest = L.next(B)
        L.link(A, rest).linkRole(A, 'swap')
        t.step('w1', `Write 1: a.next ← ${rest ? L.v(rest) : 'null'} (the rest of the list). a now skips b.`, { pairs })
        L.link(B, A).linkRole(B, 'swap')
        t.step('w2', `Write 2: b.next ← a. The pair is internally flipped: b → a.`, { pairs })
        L.link(prev, B).linkRole(prev, 'swap')
        t.step('w3', `Write 3: prev.next ← b. The flipped pair is spliced in: prev → b → a → rest.`, { pairs: pairs + 1 })
        prev = A
        L.ptr('prev', prev).clear().role(dummy, 'dim')
        L.role(A, 'new').role(B, 'new')
        t.step('advance', `prev ← a (the pair's new tail) — the anchor for the next pair.`, { pairs })
      }
      const h = L.next(dummy)
      L.remove(dummy)
      L.setHead(h).ptr('prev', undefined).clear().relayout()
      t.step('done', `Result: [${L.values().join(' ')}]. ${pairs} pair(s) swapped, 3 writes each; an odd last node stays put. Swapping VALUES would pass this test too — but breaks when nodes carry payloads (satellite data, other lists pointing at the node).`, { pairs })
    }),
}

/* ───────────────────────── 22. Reverse in k-groups ───────────────────────── */

export const llReverseKGroup: Algorithm = {
  id: 'll-reverse-k-group',
  title: 'Reverse nodes in k-groups — the hard one, decomposed',
  blurb: 'Count k nodes; if fewer remain, stop (or reverse anyway — the variant). Reverse the group with the three-pointer flip, stitch both ends, move the anchor. Every write is shown.',
  legend: { window: 'current k-group', active: 'cur', best: 'prev in group', swap: 'stitch', dim: 'anchor', done: 'finished group' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5 6 7 8 9 10 11', maxLen: 12 },
    { name: 'k', label: 'Group size k', type: 'number', default: '3', min: 1, max: 6 },
  ],
  random: () => ({ arr: list(rarr(rint(5, 10), 1, 9)), k: String(rint(2, 4)) }),
  code: {
    pseudo: `
function reverseKGroup(head, k)
  dummy ← Node(0); dummy.next ← head; anchor ← dummy        // @init
  loop                                                       // @loop
    probe ← anchor; count k nodes ahead                      // @probe
    if fewer than k remain: break                            // @short
    prev ← null; cur ← anchor.next                           // @flipinit
    flip k times (nxt ← cur.next; cur.next ← prev; …)        // @flip
    anchor.next ← prev                                       // @stitchfront
    (group tail).next ← cur                                  // @stitchback
    anchor ← group tail                                      // @advance
  return dummy.next                                          // @done`,
    cpp: `
ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy(0); dummy.next = head;                 // @init
    ListNode* anchor = &dummy;                            // @init
    for (;;) {                                            // @loop
        ListNode* probe = anchor; int cnt = 0;            // @probe
        while (probe && cnt < k) { probe = probe->next; cnt++; }  // @probe
        if (cnt < k) break;                               // @short
        ListNode *prev = nullptr, *cur = anchor->next;    // @flipinit
        ListNode* groupTail = cur;
        for (int i = 0; i < k; i++) {                     // @flip
            ListNode* nxt = cur->next;                    // @flip
            cur->next = prev;                             // @flip
            prev = cur; cur = nxt;                        // @flip
        }
        anchor->next = prev;                              // @stitchfront
        groupTail->next = cur;                            // @stitchback
        anchor = groupTail;                               // @advance
    }
    return dummy.next;                                    // @done
}`,
    python: `
def reverse_k_group(head, k):
    dummy = Node(0); dummy.next = head            # @init
    anchor = dummy                                # @init
    while True:                                   # @loop
        probe, cnt = anchor, 0                    # @probe
        while probe and cnt < k:                  # @probe
            probe = probe.next; cnt += 1          # @probe
        if cnt < k: break                         # @short
        prev, cur = None, anchor.next             # @flipinit
        group_tail = cur
        for _ in range(k):                        # @flip
            nxt = cur.next                        # @flip
            cur.next = prev                       # @flip
            prev, cur = cur, nxt                  # @flip
        anchor.next = prev                        # @stitchfront
        group_tail.next = cur                     # @stitchback
        anchor = group_tail                       # @advance
    return dummy.next                             # @done`,
    java: `
ListNode reverseKGroup(ListNode head, int k) {
    ListNode dummy = new ListNode(0); dummy.next = head;  // @init
    ListNode anchor = dummy;                              // @init
    while (true) {                                        // @loop
        ListNode probe = anchor; int cnt = 0;             // @probe
        while (probe != null && cnt < k) { probe = probe.next; cnt++; }   // @probe
        if (cnt < k) break;                               // @short
        ListNode prev = null, cur = anchor.next;          // @flipinit
        ListNode groupTail = cur;
        for (int i = 0; i < k; i++) {                     // @flip
            ListNode nxt = cur.next;                      // @flip
            cur.next = prev;                              // @flip
            prev = cur; cur = nxt;                        // @flip
        }
        anchor.next = prev;                               // @stitchfront
        groupTail.next = cur;                             // @stitchback
        anchor = groupTail;                               // @advance
    }
    return dummy.next;                                    // @done
}`,
  },
  run: ({ arr, k }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const kk = nat(k, 'k', 1, 6)
      const L = t.list('L', a, { label: 'list', showHead: false })
      const realHead = L.head
      const dummy = L.add(0, 0)
      L.link(dummy, realHead).setHead(dummy).role(dummy, 'dim')
      let anchor = dummy
      L.ptr('anchor', anchor)
      t.step('init', `Dummy + anchor. Plan per group: probe ahead k nodes, flip exactly k, stitch front and back, hop the anchor to the group's new tail.`, { k: kk, groups: 0 })
      let groups = 0
      for (;;) {
        L.clear().role(dummy, 'dim').role(anchor, 'dim')
        let probe: string | null = anchor
        let cnt = 0
        const groupIds: string[] = []
        while (probe && cnt < kk) {
          probe = L.next(probe)
          cnt++
          if (probe) groupIds.push(probe)
        }
        groupIds.forEach((id) => L.role(id, 'window'))
        t.step('probe', `Probe from the anchor: ${cnt} node(s) ahead ${cnt < kk ? '— fewer than k' : `(${groupIds.map((id) => L.v(id)).join(' ')})`}.`, { k: kk, groups })
        if (cnt < kk) {
          t.step('short', `Only ${cnt} < ${kk} nodes remain: leave them as they are and stop. (The "reverse the remainder too" variant just runs the flip on ${cnt} nodes here.)`, { k: kk, groups })
          break
        }
        let prev: string | null = null
        let cur: string | null = L.next(anchor)
        const groupTail = cur
        t.step('flipinit', `Flip the group with the usual three pointers — exactly ${kk} flips, then cur lands on the first node AFTER the group.`, { k: kk, groups })
        for (let i = 0; i < kk; i++) {
          L.clear().role(dummy, 'dim').role(cur!, 'active')
          if (prev) L.role(prev, 'best')
          const nxt = L.next(cur)
          L.link(cur!, prev).linkRole(cur!, 'swap')
          t.step('flip', `Flip ${i + 1}/${kk}: ${L.v(cur)}.next ← ${prev ? L.v(prev) : 'null (stitched later)'}.`, { k: kk, groups })
          prev = cur
          cur = nxt
        }
        L.clear().linkRole(anchor, 'swap')
        L.link(anchor, prev)
        t.step('stitchfront', `Front stitch: anchor.next ← ${L.v(prev)} (the group's new head).`, { k: kk, groups })
        L.linkRole(groupTail!, 'swap')
        L.link(groupTail!, cur)
        t.step('stitchback', `Back stitch: the group's old head (${L.v(groupTail)}, now its tail).next ← ${cur ? L.v(cur) : 'null'}.`, { k: kk, groups: groups + 1 })
        L.clear()
        L.ids(prev).forEach((id) => L.role(id, 'done'))
        anchor = groupTail!
        L.ptr('anchor', anchor)
        groups++
        t.step('advance', `Anchor hops to ${L.v(anchor)} — the flipped group's tail — ready to probe the next ${kk}.`, { k: kk, groups })
      }
      const h = L.next(dummy)
      L.remove(dummy)
      L.setHead(h).ptr('anchor', undefined).clear().relayout()
      t.step('done', `Final list: [${L.values().join(' ')}]. ${groups} group(s) reversed, O(n) time, O(1) space, every node visited at most twice (probe + flip).`, { k: kk, groups })
    }),
}

/* ───────────────────────── 23. Odd-even regrouping ───────────────────────── */

export const llOddEven: Algorithm = {
  id: 'll-odd-even',
  title: 'Odd-even list — two sublists grown in parallel, then joined',
  blurb: 'Thread all odd-position nodes onto one chain and even-position nodes onto another as you walk once, then attach the even chain after the odd. No new nodes, one pass.',
  legend: { active: 'node being threaded', compare: 'even chain', new: 'just threaded', done: 'final list', window: 'odd chain' },
  inputs: [{ name: 'arr', label: 'Values', type: 'array', default: '1 2 3 4 5 6 7', maxLen: 12 }],
  random: () => ({ arr: list(rarr(rint(5, 10), 1, 9)) }),
  code: {
    pseudo: `
function oddEven(head)
  if head = null: return null                          // @init
  odd ← head; even ← head.next; evenHead ← even        // @init
  while even ≠ null and even.next ≠ null               // @loop
    odd.next ← even.next; odd ← odd.next               // @oddstep
    even.next ← odd.next; even ← even.next             // @evenstep
  odd.next ← evenHead                                  // @join
  return head                                          // @done`,
    cpp: `
ListNode* oddEven(ListNode* head) {
    if (!head) return nullptr;                         // @init
    ListNode *odd = head, *even = head->next;          // @init
    ListNode* evenHead = even;                         // @init
    while (even && even->next) {                       // @loop
        odd->next = even->next;                        // @oddstep
        odd = odd->next;                               // @oddstep
        even->next = odd->next;                        // @evenstep
        even = even->next;                             // @evenstep
    }
    odd->next = evenHead;                              // @join
    return head;                                       // @done
}`,
    python: `
def odd_even(head):
    if not head: return None                     # @init
    odd = head; even = head.next                 # @init
    even_head = even                             # @init
    while even and even.next:                    # @loop
        odd.next = even.next                     # @oddstep
        odd = odd.next                           # @oddstep
        even.next = odd.next                     # @evenstep
        even = even.next                         # @evenstep
    odd.next = even_head                         # @join
    return head                                  # @done`,
    java: `
ListNode oddEven(ListNode head) {
    if (head == null) return null;                     // @init
    ListNode odd = head, even = head.next;             // @init
    ListNode evenHead = even;                          // @init
    while (even != null && even.next != null) {        // @loop
        odd.next = even.next;                          // @oddstep
        odd = odd.next;                                // @oddstep
        even.next = odd.next;                          // @evenstep
        even = even.next;                              // @evenstep
    }
    odd.next = evenHead;                               // @join
    return head;                                       // @done
}`,
  },
  run: ({ arr }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const L = t.list('L', a, { label: 'list', showHead: false })
      let odd = L.head!
      let even: string | null = L.next(odd)
      const evenHead = even
      L.ptr('odd', odd).ptr('even', even).role(odd, 'window')
      if (even) L.role(even, 'compare')
      t.step('init', `odd starts at node 1, even at node 2; evenHead is bookmarked — it is where the two chains will be joined. Invariant: the odd chain and even chain are each internally correct after every round.`, { round: 0 })
      let round = 0
      while (even && L.next(even)) {
        round++
        const nextOdd = L.next(even)!
        L.link(odd, nextOdd).linkRole(odd, 'swap')
        odd = nextOdd
        L.ptr('odd', odd).clear().role(odd, 'new')
        t.step('oddstep', `Round ${round}: odd jumps over the even node to ${L.v(odd)} (position ${2 * round + 1}). The odd chain grows by one.`, { round })
        const nextEven = L.next(odd)
        L.link(even, nextEven)
        if (nextEven) L.linkRole(even, 'swap')
        even = nextEven
        L.ptr('even', even).clear()
        L.role(odd, 'window')
        if (even) L.role(even, 'compare')
        t.step('evenstep', `even jumps to ${even ? `${L.v(even)} (position ${2 * round + 2})` : 'null'}. The even chain grows by one. Notice both chains live inside the same nodes — no allocation at all.`, { round })
      }
      L.clear().linkRole(odd, 'swap')
      L.link(odd, evenHead)
      t.step('join', `One write joins the chains: odd-tail.next ← evenHead (${evenHead ? L.v(evenHead) : 'null'}). All odd positions now precede all even positions.`, { round })
      L.clear().relayout()
      L.ids().forEach((id) => L.role(id, 'done'))
      t.step('done', `Result: [${L.values().join(' ')}]. One pass, O(1) space, positions not values decide the grouping — a trap when values happen to be odd/even numbers.`, { round })
    }),
}

/* ───────────────────────── 24. Partition a list around x ───────────────────────── */

export const llPartition: Algorithm = {
  id: 'll-partition',
  title: 'Partition around x — less-chain then greater-chain, stable',
  blurb: 'Grow two chains as you walk (values < x, values ≥ x), then concatenate. Original relative order inside each chain is preserved — stability that quicksort\'s array partition loses.',
  legend: { active: 'node being routed', window: 'less chain', compare: 'geq chain', swap: 'concatenation write', done: 'final' },
  inputs: [
    { name: 'arr', label: 'Values', type: 'array', default: '3 5 8 5 10 2 1 7 4 6', maxLen: 12 },
    { name: 'x', label: 'Pivot x', type: 'number', default: '5', min: -99, max: 999 },
  ],
  random: () => ({ arr: list(rarr(rint(5, 9), 1, 10)), x: String(rint(2, 9)) }),
  code: {
    pseudo: `
function partition(head, x)
  lessDummy ← Node(0); geqDummy ← Node(0)            // @init
  less ← lessDummy; geq ← geqDummy                   // @init
  while head ≠ null                                  // @loop
    if head.value < x: less.next ← head; less ← less.next    // @toless
    else geq.next ← head; geq ← geq.next             // @togeq
    head ← head.next                                 // @advance
  geq.next ← null                                    // @seal
  less.next ← geqDummy.next                          // @concat
  return lessDummy.next                              // @done`,
    cpp: `
ListNode* partition(ListNode* head, int x) {
    ListNode lessDummy(0), geqDummy(0);              // @init
    ListNode *less = &lessDummy, *geq = &geqDummy;   // @init
    while (head) {                                   // @loop
        if (head->val < x) {                         // @toless
            less->next = head; less = head;          // @toless
        } else {                                     // @togeq
            geq->next = head; geq = head;            // @togeq
        }
        head = head->next;                           // @advance
    }
    geq->next = nullptr;                             // @seal
    less->next = geqDummy.next;                      // @concat
    return lessDummy.next;                           // @done
}`,
    python: `
def partition(head, x):
    less_dummy = Node(0); geq_dummy = Node(0)        # @init
    less, geq = less_dummy, geq_dummy                # @init
    while head:                                      # @loop
        if head.val < x:                             # @toless
            less.next = head; less = head            # @toless
        else:                                        # @togeq
            geq.next = head; geq = head              # @togeq
        head = head.next                             # @advance
    geq.next = None                                  # @seal
    less.next = geq_dummy.next                       # @concat
    return less_dummy.next                           # @done`,
    java: `
ListNode partition(ListNode head, int x) {
    ListNode lessDummy = new ListNode(0), geqDummy = new ListNode(0);   // @init
    ListNode less = lessDummy, geq = geqDummy;       // @init
    while (head != null) {                           // @loop
        if (head.val < x) {                          // @toless
            less.next = head; less = head;           // @toless
        } else {                                     // @togeq
            geq.next = head; geq = head;             // @togeq
        }
        head = head.next;                            // @advance
    }
    geq.next = null;                                 // @seal
    less.next = geqDummy.next;                       // @concat
    return lessDummy.next;                           // @done
}`,
  },
  run: ({ arr, x }) =>
    trace((t) => {
      const a = vals(arr, 'Values', -99, 999)
      const pivot = nat(x, 'x', -99, 999)
      const L = t.list('L', a, { label: 'input', showHead: false })
      const R = t.list('R', [], { label: 'less | geq chains', showHead: false })
      const ld = R.add('L₀')
      const gd = R.add('G₀')
      R.role(ld, 'dim').role(gd, 'dim').ptr('less', ld).ptr('geq', gd)
      let lessTail = ld
      let geqTail = gd
      let firstLess: string | null = null
      let firstGeq: string | null = null
      let cur = L.head
      L.ptr('cur', cur)
      if (cur) L.role(cur, 'active')
      t.step('init', `Two dummy-headed chains: "less" (< ${pivot}) and "geq" (≥ ${pivot}). Each input node is routed to one chain, in the order met — that order is what makes the partition stable.`, { x: pivot, lessN: 0, geqN: 0 })
      let lessN = 0
      let geqN = 0
      while (cur) {
        const v = L.v(cur) as number
        L.clear().role(cur, 'active')
        const copy = R.add(v)
        if (v < pivot) {
          if (!firstLess) firstLess = copy
          R.link(lessTail, copy).linkRole(lessTail, 'swap').role(copy, 'window')
          lessTail = copy
          R.ptr('less', lessTail)
          lessN++
          t.step('toless', `${v} < ${pivot}: thread onto the less chain (position ${lessN}). Its place among the small values is locked by arrival order.`, { x: pivot, lessN, geqN })
        } else {
          if (!firstGeq) firstGeq = copy
          R.link(geqTail, copy).linkRole(geqTail, 'swap').role(copy, 'compare')
          geqTail = copy
          R.ptr('geq', geqTail)
          geqN++
          t.step('togeq', `${v} ≥ ${pivot}: thread onto the geq chain (position ${geqN}). Equal values go right — "stable partition", not "swap equal elements to the middle".`, { x: pivot, lessN, geqN })
        }
        cur = L.next(cur)
        L.ptr('cur', cur)
        if (cur) {
          L.clear().role(cur, 'active')
        }
        t.step('advance', `Advance to ${cur ? L.v(cur) : 'the end'}.`, { x: pivot, lessN, geqN })
      }
      R.link(geqTail, null)
      t.step('seal', `Seal the geq chain: its tail.next ← null. Skip this and the last geq node still points into the old input order — a cycle or a duplicated tail.`, { x: pivot, lessN, geqN })
      R.link(lessTail, R.next(gd)).linkRole(lessTail, 'swap')
      t.step('concat', `Concatenate: less-tail.next ← geqDummy.next. One write merges the two chains.`, { x: pivot, lessN, geqN })
      R.remove(ld)
      R.remove(gd)
      R.ptr('less', undefined).ptr('geq', undefined).clear()
      R.setHead(firstLess ?? firstGeq).relayout()
      R.ids().forEach((id) => R.role(id, 'done'))
      t.step('done', `Partitioned: [${R.values().join(' ')}] — every value < ${pivot} before every value ≥ ${pivot}, both groups in original order. One pass, O(1) space, stable.`, { x: pivot, lessN, geqN })
    }),
}

export const algorithms3 = [llMergeSorted, llMergeSort, llIntersection, llUnionDedupe, llSwapPairs, llReverseKGroup, llOddEven, llPartition]
