import type { Question } from '../../../questions/types'

const T = 'linked-lists'

export const questions4: Question[] = [
  // ── Extra pointers
  {
    id: 'll-q-weave-order', topic: T, page: 'extra-pointers', kind: 'order', difficulty: 'medium',
    title: 'The weave, pass by pass',
    prompt: 'Order the passes of the O(1)-space deep copy of a random-pointer list.',
    items: [
      'Weave: splice each clone directly after its original, so the list itself becomes the lookup table (A→A′→B→B′→C→C′)',
      'Random: for each original u, set u->next->random ← u->random ? u->random->next : null',
      'Unweave: heal every original (u->next ← u->next->next) while threading the clones into their own chain',
      'Return the clone chain’s head (dummy.next)',
    ],
    explain: 'Pass 1 creates the invariant "the clone of x is x->next" — that is the whole trick: the woven list replaces the hash map. Pass 2 consumes the invariant (one hop from any original lands on its clone, so u->random->next IS the clone of u->random). Pass 3 destroys the weave carefully: healing an original BEFORE advancing (u = u->next after the heal is already the next ORIGINAL) is the stride that separates the two chains. The passes cannot reorder: randoms before weaving have nowhere to point, and unweaving before the random pass erases the lookup table.',
  },
  {
    id: 'll-q-weave-why', topic: T, page: 'extra-pointers', kind: 'mcq', difficulty: 'medium',
    title: 'Why one hop finds the clone',
    prompt: 'In pass 2 of the weave, `u->next->random = u->random ? u->random->next : null` correctly copies the random pointer. Why does `u->random->next` land on the CLONE of the random target?',
    options: [
      'Because clones are allocated in address order',
      'Because pass 1 spliced every clone DIRECTLY AFTER its original, so for any node x in the woven list, x->next is x’s clone',
      'Because random pointers always point forward',
      'Because the hash map from pass 1 stores the mapping',
    ],
    answer: 1,
    explain: 'The weave’s invariant: after pass 1, walking one step from ANY original lands on its clone — the list itself is the original→clone map, which is exactly why no hash map is needed and space is O(1). So u->random (an original, or null) plus one hop gives its clone. Option 4 is the OTHER solution (map version, O(n) space) — the weave exists to avoid it. The null case must be handled explicitly (u->random may be null; then its clone is null, not a hop away). And the trade to name out loud: the weave temporarily CORRUPTS the input (doubled nodes) — it needs exclusive access, while the map version never touches the input.',
  },
  {
    id: 'll-q-flatten-stack', topic: T, page: 'extra-pointers', kind: 'mcq', difficulty: 'medium',
    title: 'What the stack remembers',
    prompt: 'Flattening a multilevel doubly list iteratively uses a stack. What does the stack hold, and why?',
    options: [
      'All nodes, so they can be sorted later',
      'The `next` pointers interrupted by a child — the return points to resume at once a child chain runs out; it is exactly what recursion would hold on its frames',
      'The child pointers, to process them last',
      'A history of prev writes, to undo them',
    ],
    answer: 1,
    explain: 'When cur dives into cur.child, the node cur->next is orphaned — nothing in the flattened-so-far chain remembers it. Pushing it stores the RETURN POINT; when the child chain’s tail hits null, the pop restores continuity (cur.next ← resume, resume.prev ← cur — both directions, doubly discipline). The stack holds precisely what the call stack would hold if this were written recursively (each frame remembers where to resume), which makes it the canonical "recursion made explicit" — the same muscle as iterative tree/graph DFS ahead, and the direct answer to "now do it without recursion". Space: O(depth), not O(n) — only interrupted levels are stored.',
  },
  {
    id: 'll-q-add-carry', topic: T, page: 'extra-pointers', kind: 'numeric', difficulty: 'medium',
    title: '999 + 1, iteration by iteration',
    prompt: 'addTwoNumbers on reversed-digit lists 9→9→9 (999) and 1 (1) runs `while (a || b || carry)`. How many iterations does the loop perform, and the result has the same number of nodes?',
    answer: 4,
    hint: 'Three paired iterations produce 0,0,0 each with carry 1; then a and b are both null but carry is still 1.',
    explain: 'Iterations: (9+1+0) → digit 0, carry 1; (9+9... precisely carry + 9 + 0) → 0, carry 1; again → 0, carry 1; now a and b are exhausted but carry = 1 forces a FOURTH iteration → digit 1, carry 0. Result: 0→0→0→1 = 1000. The loop condition `a || b || carry` is the whole lesson: OR, not AND — stopping on `a && b` loses ragged tails, and forgetting `|| carry` loses exactly this final 1 (999+1 → "000"). Both are one-character fixes and both are favourite hidden tests. And the deeper point: the number is NEVER formed — hundreds of digits would overflow any int/long, so digit-streaming is not a style choice but the only correct approach.',
  },
  {
    id: 'll-q-add-forward', topic: T, page: 'extra-pointers', kind: 'multi', difficulty: 'medium',
    title: 'The forward-digit follow-up',
    prompt: 'Digits now arrive MOST-significant first (3→4→2 = 342). Select every valid approach to add two such numbers.',
    options: [
      'Reverse both lists in place, add with the streaming carry, reverse the result — O(n) time, O(1) space, but MUTATES the inputs',
      'Recurse to the ends of both lists and add on the way back, propagating the carry up — O(n) time, O(n) stack',
      'Copy both digit sequences into arrays (or count lengths and align), add from the ends — O(n) time, O(n) space, inputs untouched',
      'Convert both lists to a long long, add, and split the result into digits — simplest and always correct',
    ],
    answers: [0, 1, 2],
    explain: 'School arithmetic needs the ONES digits first, and forward storage puts them last — so every valid approach manufactures back-to-front access somehow: by reversing (cheapest, mutates), by recursion (elegant, depth-n stack — crash risk past ~104 nodes), or by copying (safe, O(n) space). Naming all three WITH costs and asking "may I mutate?" is the complete interview answer. Option 4 is the trap the problem exists to spring: the number can have hundreds of digits — every integer type overflows (even 2^64 holds only 19–20 digits). "Never form the number" is the rule.',
  },
  {
    id: 'll-q-extra-multi', topic: T, page: 'extra-pointers', kind: 'multi', difficulty: 'hard',
    title: 'Extra-pointer facts',
    prompt: 'Select every TRUE statement.',
    options: [
      'The weave temporarily corrupts the input (doubled nodes) — it requires exclusive access, which is a real disqualifier when other threads read the list.',
      'The hash-map copy never touches the input, so it is the parallel-safe choice despite O(n) space.',
      'A deep copy that neither mutates the input nor uses O(n) space is impossible in general — you need SOME original→clone association and the untouched input cannot hold it.',
      'Flatten’s explicit stack is O(depth) space, not O(n) — only the interrupted levels are stored.',
      'In flatten, leaving `cur.child` non-null after splicing is harmless because judges only walk next pointers.',
    ],
    answers: [0, 1, 2, 3],
    explain: 'The weave/map trade is space-vs-input-integrity, and knowing when the clever solution is DISQUALIFIED (shared access) is the senior signal; the impossibility argument for option 3 is the standard "can you do better?" closer; flatten stores one return point per interrupted level. FALSE: leftover child pointers are exactly what structure-verifying judges reject — and conceptually the node keeps a second route into the flattened region, breaking the "one flat doubly list" contract. Every splice in flatten also writes BOTH directions (next and prev) — half-written doubly links are the page-4 disease.',
  },

  // ── Cheatsheet
  {
    id: 'll-q-cheat-match', topic: T, page: 'cheatsheet', kind: 'match', difficulty: 'medium',
    title: 'Recognition: if the problem says X, think Y',
    prompt: 'Match each problem statement with its template.',
    left: [
      '"delete the nth node from the end, one pass"',
      '"the head itself might be deleted"',
      '"is it a palindrome — O(1) space"',
      '"does it cycle, and where does the cycle start"',
      '"deep-copy a random-pointer list — O(1) space"',
    ],
    right: [
      'fixed-gap pointers (gap n+1) with a dummy',
      'dummy head',
      'middle + reverse half + compare (+ restore)',
      'Floyd, then head-vs-meeting-point walk',
      'the weave',
    ],
    explain: 'The recognition guide compressed. Deletion needs the victim’s PREDECESSOR, hence gap n+1 and a dummy (the victim may be the head). "Head might change" is the dummy’s entire job description. O(1)-space palindrome is the three-primitive composition. Cycle entrance is Floyd’s two phases. O(1)-space deep copy is the weave (map version if the input must stay untouched). Drill this table until each left side triggers its right side in under two seconds — recognition speed is half the interview battle.',
  },
  {
    id: 'll-q-cheat-multi', topic: T, page: 'cheatsheet', kind: 'multi', difficulty: 'medium',
    title: 'The checklist that ships',
    prompt: 'Select every item that belongs on the universal pre-"done" checklist for list code.',
    options: [
      'Empty list, one node, two nodes — hand-traced; the degenerate cases are where guards live or die.',
      'Head changes: did I return the NEW head (dummy.next / prev), and does the caller rebind it?',
      'Write order: every overwrite — was everything it needed read first? (nxt before flip; n.next before p.next.)',
      'Query functions that mutated the list restore it — on BOTH exits, including the mismatch early-return.',
      'A `fast && fast->next` guard stops slow at the FIRST middle on even-length lists.',
    ],
    answers: [0, 1, 2, 3],
    explain: 'The ten-point checklist’s core: degenerate traces, returned-head discipline, read-before-write, sealed tails, prev-stays-after-unlink, identity-vs-value, restore, free-exactly-once. FALSE: `fast && fast->next` stops slow at the SECOND middle (index n/2) — the first middle needs fast one ahead or the next-next guard. That single fact has its own checklist slot precisely because it is the most repeated guard error in interviews.',
  },
  {
    id: 'll-q-cheat-pick', topic: T, page: 'cheatsheet', kind: 'mcq', difficulty: 'easy',
    title: 'The composition disguised as hard',
    prompt: 'Which problem is pure composition — middle (page 6) + reverse (page 5) + two-chain threading (page 11), with nothing new?',
    options: [
      'Reorder L0→Ln→L1→Ln−1→…',
      'Copy list with random pointer',
      'Merge K sorted lists',
      'Josephus problem',
    ],
    answer: 0,
    explain: 'Reorder: you cannot walk backwards, so MAKE the back half walkable — find the middle, cut, reverse the second half, then zip the two halves alternately. Every phase is a primitive from earlier pages; if you can write middle, reverse and threading cold, reorder is ten lines. Interviewers know this — it is a composition test disguised as a hard problem, and saying the three phases OUT LOUD before coding often earns "good, that’s the answer" immediately. The others need genuinely new machinery: the weave or a map (copy-random), a heap of heads (merge K), a ring with counted unlinks (Josephus).',
  },
  {
    id: 'll-q-cheat-complexity', topic: T, page: 'cheatsheet', kind: 'numeric', difficulty: 'easy',
    title: 'How deep is the recursion, really?',
    prompt: 'Merge sort runs on a list of 1,000,000 nodes. Approximately how many recursion levels (stack frames deep) does it reach? (log base 2, nearest integer.)',
    answer: 20,
    tolerance: 1,
    unit: 'levels',
    hint: '2^20 ≈ 10^6.',
    explain: 'log2(10^6) ≈ 19.9 ⇒ about 20 levels — a trivially safe stack, which is why list merge sort’s O(log n) stack is never a concern, even for millions of nodes. Contrast the two depth-n recursions from this topic: recursive REVERSAL (one frame per node — 10^6 frames, guaranteed overflow) and the recursive palindrome (same). "Which list recursions are depth-log-n and which are depth-n?" is a real discriminator: split-in-half recursions are log-deep; walk-one-node recursions are n-deep. The ledger’s space column encodes exactly this: O(log n) stack vs O(n) stack.',
  },
  {
    id: 'll-q-cheat-order', topic: T, page: 'cheatsheet', kind: 'order', difficulty: 'easy',
    title: 'Run the checklist in order',
    prompt: 'Order the universal bug checklist as the cheatsheet lists it (degenerate cases first, then structure, then memory).',
    items: [
      'Empty list: does every branch survive head = null?',
      'One node: pairs, middles, reversals all degenerate here',
      'Two nodes: the merge-sort split guard and swap-pairs live or die here',
      'Head changes: returned the NEW head, and the caller rebinds',
      'Write order: every overwrite had its reads first',
      'Tails sealed: every grown chain ends in null; every closed ring got cut',
    ],
    explain: 'Degenerate sizes first (0, 1, 2 — where every guard is actually decided), then the structural invariants (returned head, read-before-write, sealed tails), then the checklist’s remaining items: prev-doesn’t-advance-after-unlink, identity-vs-value (Python: `is`), restore-after-mutation, and free-exactly-once in C/C++. Running the list in a FIXED order is the point — a checklist consulted at random is a checklist half-forgotten. Ten items, thirty seconds, before every "I’m done".',
  },
  {
    id: 'll-q-cheat-fill', topic: T, page: 'cheatsheet', kind: 'fill', difficulty: 'easy',
    title: 'Self-test atom: the merge',
    prompt: 'One of the five atoms you must write from memory before any list interview: the stable merge of two sorted lists. Complete it.',
    lang: 'cpp',
    code: `
ListNode* merge(ListNode* a, ListNode* b) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (a && b) {
        if ([[0]]) { tail->next = a; a = a->next; }
        else       { tail->next = b; b = b->next; }
        [[1]];
    }
    tail->next = [[2]];      // remainder attaches whole
    return dummy.next;
}`,
    blanks: [
      ['a->val <= b->val', 'a->val<=b->val'],
      ['tail = tail->next', 'tail=tail->next'],
      ['a ? a : b', 'a != nullptr ? a : b', 'a ? a : b'],
    ],
    explain: 'The ≤ is the stability guarantee (ties go to a — equal elements keep input order), the tail pointer makes every append O(1) (the dummy owns the growing result; tail marks its end), and the remainder attach is ONE write because the surviving list is already sorted and entirely ≥ the last appended node. Zero allocations: the original nodes are relinked. This is atom #3 of the 30-second self-test — with reverse, middle-with-correct-guard, Floyd, and removeAll-with-dummy the other four. Ten minutes, five functions, from memory: if any one is shaky, re-run its animation and rewrite it.',
  },
  {
    id: 'll-q-cheat-lru', topic: T, page: 'cheatsheet', kind: 'mcq', difficulty: 'medium',
    title: 'The design pattern to carry forward',
    prompt: 'An LRU cache must do get and put (including eviction) in O(1). Which combination delivers it, and why is each part necessary?',
    options: [
      'A hashmap alone — O(1) lookups are all that matters',
      'A doubly linked list alone — recency order is all that matters',
      'Hashmap key→node PLUS a doubly list by recency: the map gives O(1) node lookup, the doubly list gives O(1) unlink-and-move of a HELD node and O(1) eviction from the tail',
      'Hashmap plus a SINGLY list — same thing, less memory',
    ],
    answer: 2,
    explain: 'Each structure covers the other’s weakness: the map finds any entry’s NODE in O(1) (a list alone would walk to find it), and the doubly list moves/unlinks a HELD node in O(1) via prev (a map alone has no recency order). Option 4 fails on the unlink: a singly list cannot remove a held node without its predecessor — an O(n) walk per hit, destroying the design. Eviction is tail removal (O(1), doubly again), refresh-on-get is unlink + push-front (O(1)). This exact pairing — plus LFU, browser history, playlists — is why doubly lists exist as a topic; the full build happens in the Hashing topic using this page’s erase/insertBetween primitives.',
  },
]
