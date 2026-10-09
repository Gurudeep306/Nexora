import type { Question } from '../../../questions/types'

const T = 'linked-lists'

export const questions3: Question[] = [
  // ── Merging & merge sort
  {
    id: 'll-q-merge-trace', topic: T, page: 'merging-sort', kind: 'array', difficulty: 'easy',
    title: 'Merge, node by node',
    prompt: 'Merge the sorted lists a = [3, 5, 8] and b = [1, 2, 7, 9] with the tail-pointer merge (ties would go to a; there are none here). List the values appended to the result, in order.',
    answer: [1, 2, 3, 5, 7, 8, 9],
    placeholder: 'e.g. 1, 2, 3',
    hint: 'Each round compares the two HEADS and appends the smaller; when one list empties, the other’s remainder attaches in one write.',
    explain: 'Rounds: 3 vs 1 → append 1; 3 vs 2 → 2; 3 vs 7 → 3; 5 vs 7 → 5; 8 vs 7 → 7; 8 vs 9 → 8; now a is empty, so b’s remainder [9] attaches whole — one write, no loop. Six comparisons for seven output nodes: the merge does AT MOST one comparison per output node, hence O(na + nb). The remainder attach is safe because both lists are sorted: everything left in b is ≥ the last appended 8. Zero allocations happened — the original nodes were relinked onto the result chain.',
  },
  {
    id: 'll-q-merge-stable', topic: T, page: 'merging-sort', kind: 'mcq', difficulty: 'medium',
    title: 'The one character that is stability',
    prompt: 'The merge takes from list a when `a->val <= b->val`. What would flipping it to `<` change?',
    options: [
      'Nothing — both produce the same sorted output and the same stability',
      'The output would still be sorted, but on TIES it would take from b first — equal elements from b would precede equal elements from a, breaking stability',
      'The output would no longer be sorted',
      'The merge would loop forever',
    ],
    answer: 1,
    explain: 'Sortedness survives either way (equal values are interchangeable in the output ORDER of values) — but elements carry satellite data and identity. With ≤, a tied value from a is appended before b’s, preserving input order among equals: stability. With <, ties go to b first and same-value elements swap relative order. This matters whenever merges compose (merge sort is stable exactly because its merge is) and whenever satellite data rides along (sort people by age, keep registration order within an age). "Is your sort stable, and why?" — the answer is this single comparison operator.',
  },
  {
    id: 'll-q-mergesort-recurrence', topic: T, page: 'merging-sort', kind: 'mcq', difficulty: 'medium',
    title: 'The recurrence, solved',
    prompt: 'Merge sort on a list splits in O(n) (fast/slow walk), recurses on both halves, merges in O(n). Which recurrence describes it, and what does it solve to?',
    options: [
      'T(n) = T(n/2) + Θ(n) ⇒ Θ(n)',
      'T(n) = 2T(n/2) + Θ(n) ⇒ Θ(n log n)',
      'T(n) = 2T(n/2) + Θ(1) ⇒ Θ(n)',
      'T(n) = T(n−1) + Θ(n) ⇒ Θ(n2)',
    ],
    answer: 1,
    explain: 'Two subproblems of half the size, Θ(n) work per level (the split walk plus the merge): 2T(n/2) + Θ(n) ⇒ Θ(n log n) — master theorem case 2, or the level-sum picture: log n levels, every level touches each node O(1) times. Option 1 is binary search (one subproblem). Option 3’s Θ(1) glue would give Θ(n) but a list split is a WALK, not an index — Θ(n) is unavoidable. Option 4 is insertion sort’s shape. And the space half of the answer: O(log n) recursion stack, O(1) auxiliary — versus Θ(n) auxiliary for array merge sort, which is the list version’s whole advantage.',
  },
  {
    id: 'll-q-mergesort-guard', topic: T, page: 'merging-sort', kind: 'mcq', difficulty: 'medium',
    title: 'Why fast starts one ahead',
    prompt: 'The list merge sort uses `slow = head, fast = head->next` with `while (fast && fast->next)`. Why not `fast = head`?',
    options: [
      'It runs twice as fast',
      'With fast = head, a 2-node list splits as 2 + 0: the recursive call receives the same list and the recursion never terminates',
      'fast = head crashes on odd-length lists',
      'Both work identically; the choice is stylistic',
    ],
    answer: 1,
    explain: 'The split must end with slow at the END OF THE FIRST HALF, and the first half must be STRICTLY SMALLER than the whole. With fast one ahead, n = 2 gives an immediately-failing guard: slow stays at node 1, halves are 1 + 1, both base cases. With fast = head, the loop body runs once (slow → node 2, fast → null): the "first half" is the entire 2-node list, the second half is empty, and mergeSort recurses on the SAME list forever — stack overflow. This is why the mandatory hand-trace is n = 2, not n = 10: the degenerate case is where guards live or die.',
  },
  {
    id: 'll-q-sort-fill', topic: T, page: 'merging-sort', kind: 'fill', difficulty: 'medium',
    title: 'Split, cut, recurse',
    prompt: 'Complete the split phase of merge sort on a list.',
    lang: 'cpp',
    code: `
ListNode* mergeSort(ListNode* head) {
    if (!head || !head->next) return head;
    ListNode *slow = head, *fast = [[0]];
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = [[1]];
    [[2]];                        // CUT — two genuinely separate lists
    return merge(mergeSort(head), mergeSort(second));
}`,
    blanks: [
      ['head->next', 'head -> next'],
      ['slow->next', 'slow -> next'],
      ['slow->next = nullptr', 'slow->next=nullptr', 'slow->next = NULL', 'slow->next = null'],
    ],
    explain: 'fast starts ONE AHEAD (the termination guarantee for n = 2), second bookmarks slow->next BEFORE the cut, and the cut `slow->next = nullptr` makes the halves independent — without it the left half’s tail still points into the right half and the merge walks a corrupted chain (often an infinite loop). Order matters: reading slow->next must precede overwriting it — the read-before-write rule again. The merge itself (previous question’s tie rule) returns dummy.next, which is what this function returns.',
  },
  {
    id: 'll-q-sort-match', topic: T, page: 'merging-sort', kind: 'match', difficulty: 'medium',
    title: 'Which sort belongs where',
    prompt: 'Match each sorting scenario with the structure it describes best.',
    left: [
      'Θ(n log n) sort with O(1) auxiliary memory (log n stack aside)',
      'Partition-based sort relying on random access and O(1) swaps',
      'In-place sort built on index jumps into a heap',
      'O(n2) sort whose inserts are exactly two pointer writes, no element shifts',
    ],
    right: [
      'linked list — merging is relinking, so merge sort needs no auxiliary array',
      'array — quicksort needs jumps a list cannot make',
      'array — heapsort sifts by index arithmetic, impossible on a list',
      'linked list — the scan is still O(n2), but each insert is 2 writes',
    ],
    explain: 'The table from the page, one sentence: arrays can JUMP, so partition/index-based sorts (quicksort, heapsort) win there; lists can only WALK, so walk-based sorts (merge sort, insertion sort) win here. List merge sort needs no auxiliary array because merging is relinking — the payoff for zero-copy splices. Quicksort on a list is possible but weak: no random access for pivot selection, no O(1) element swap. Heapsort is impossible: sifting is index arithmetic. List insertion sort still pays the O(n2) scan, but each insert is 2 writes regardless of payload size — the honest, narrow place where lists out-sort arrays.',
  },
  {
    id: 'll-q-insertion-numeric', topic: T, page: 'merging-sort', kind: 'numeric', difficulty: 'hard',
    title: 'Insertion sort, comparison by comparison',
    prompt: 'List insertion sort processes [4, 2, 7, 1, 3, 6, 5] by detaching each input head and scanning the sorted result with `while (p->next && p->next->val < cur->val)`. Counting every value comparison the condition performs (including the one that stops the scan, and excluding the null test that ends it), how many comparisons run in total?',
    answer: 17,
    hint: 'Per round: insert 4 → 0 comparisons; 2 → 1; 7 → 2; then 1, 3, 6, 5 against the growing sorted prefix.',
    explain: 'Round by round: 4 → 0 (empty result). 2 → 1 (2 < 4 stops immediately). 7 → 2 (scans 2, 4, falls off the end). 1 → 1. 3 → 3 (1, 2, then 3 < 4). 6 → 5 (1, 2, 3, 4, then 6 < 7). 5 → 5 (1, 2, 3, 4, then 5 < 6). Total 0+1+2+1+3+5+5 = 17 — watch the animation’s counter land on exactly this. The average case is ≈ n2/4 comparisons; on an ARRAY each insert additionally SHIFTS elements (another ≈ n2/4 data moves), while on a list every insert is two pointer writes. Sorted input is the best case: O(n) comparisons, one per element.',
  },
  {
    id: 'll-q-merge-kway', topic: T, page: 'merging-sort', kind: 'mcq', difficulty: 'medium',
    title: 'Merge K sorted lists',
    prompt: 'K sorted lists hold N nodes in total. Using a min-heap of the K current heads (pop the smallest, append it, push that list’s next node), what is the time complexity?',
    options: ['O(N·K)', 'O(N log K)', 'O(N log N)', 'O(K log N)'],
    answer: 1,
    explain: 'Each of the N nodes is popped once and its successor pushed once: 2N heap operations on a heap of size at most K, each O(log K) ⇒ O(N log K). Compare the alternatives: pairwise merging without a heap re-merges early results repeatedly (O(N·K) worst case); O(N log N) is what you get by dumping everything into one array and sorting — correct but it discards the sortedness you already have. The heap-of-heads pattern is external sorting’s engine (merge runs that don’t fit in RAM) and the Heaps topic implements it properly. Follow-up worth knowing: a tournament tree or a divide-and-conquer pairwise merge also hit O(N log K) with O(1) extra space.',
  },

  // ── Two lists side by side
  {
    id: 'll-q-int-switch-trace', topic: T, page: 'two-lists', kind: 'numeric', difficulty: 'hard',
    title: 'The switch walk, counted',
    prompt: 'List A is a1→a2→a3→s1→s2 (3 own nodes); list B is b1→b2→b3→b4→b5→s1→s2 (5 own nodes); s1,s2 are shared. p starts at a1, q at b1; each round `p = p ? p->next : b; q = q ? q->next : a`. After how many rounds does the loop exit with p == q?',
    answer: 11,
    hint: 'p’s route is A (5 nodes), then null for one round, then B’s own part (5 nodes) — landing on s1 exactly when q, walking B then A, does.',
    explain: 'Simulate: p visits a1,a2,a3,s1,s2 (rounds 1–5 put it at a2...s2, then null at round 5... precisely: after round 5 p = null, q = s1), switches to b1 at round 6, walks b1...b5 by round 10, and at round 11 steps onto s1 — exactly when q (route: B’s 7 nodes, null, a1,a2,a3) arrives at s1. Eleven rounds = a + b + c + 1, matching the code note’s bound "each pointer traverses at most a + b + c + 1 nodes". The one extra step is the shared null visit: both pointers pass through null once, which also handles the no-intersection case (they meet AT null).',
  },
  {
    id: 'll-q-int-why-meet', topic: T, page: 'two-lists', kind: 'mcq', difficulty: 'medium',
    title: 'Why switching partners works',
    prompt: 'Why do the two switch-partners pointers necessarily arrive at the intersection node in the same round?',
    options: [
      'Because they move at the same speed and start aligned',
      'Because each pointer walks the OTHER list’s stem, equalising total route length: both reach the first shared node after covering a + b (own-steps + the other’s stem)',
      'Because the shorter list’s pointer waits at the end',
      'Because hash values of the nodes match',
    ],
    answer: 1,
    explain: 'The length difference is the whole obstacle — with stems a and b, a shared node sits at different depths in the two lists, so lockstep walking never lines up. The switch cancels it: p’s route to the first shared node (second time through) covers all of A’s own stem (a) plus all of B’s own stem (b); q covers b then a. Same total a + b ⇒ same round ⇒ the `p != q` loop exits there. It is the fixed-gap trick in disguise: the gap |a − b| is absorbed by making each pointer walk the other’s stem. Option 1 is precisely what FAILS without switching — that’s the naive approach.',
  },
  {
    id: 'll-q-int-noint', topic: T, page: 'two-lists', kind: 'mcq', difficulty: 'easy',
    title: 'No intersection — and no infinite loop',
    prompt: 'Two disjoint lists (no shared nodes, lengths a and b) run through the switch-partners loop. What happens?',
    options: [
      'The loop never terminates — the pointers keep switching forever',
      'Both pointers become null in the same round: p == q == null, the loop exits, and the function returns null — the "no intersection" answer with zero special cases',
      'One pointer crashes dereferencing null',
      'The loop exits early with a wrong non-null node',
    ],
    answer: 1,
    explain: 'With c = 0, p’s route is A then B (a + b real nodes, then null) and q’s is B then A (b + a nodes, then null) — equal lengths, so they land on null SIMULTANEOUSLY at round a + b + 1 and the loop exits with p == q == null. The code note’s bound ("each pointer traverses at most a + b + c + 1 nodes, the null-switch happens at most once per pointer") is the termination proof: each pointer switches exactly once, so no infinite ping-pong. Returning p returns null — which IS the correct "no intersection" value. One loop, no case analysis: the elegance the interview follow-up ("does it terminate when there is no intersection?") is probing for.',
  },
  {
    id: 'll-q-dedup-trace', topic: T, page: 'two-lists', kind: 'array', difficulty: 'easy',
    title: 'Sorted dedup trace',
    prompt: 'dedupSorted (keep one of each value; cur does NOT advance after an unlink) runs on [1, 1, 2, 3, 3, 3, 4]. List the surviving values head→tail.',
    answer: [1, 2, 3, 4],
    placeholder: 'e.g. 1, 2, 3',
    hint: 'cur compares itself with cur->next; on equality it unlinks the NEXT node and stays put.',
    explain: 'cur starts at the first 1: equal to its next → unlink, cur stays → now cur(1).next is 2 → advance. At 2: next is 3 → advance. At the first 3: two consecutive unlinks remove the second and third 3 (cur stays after each — advancing would skip the third 3, leaving 1,1,2,3,3... the classic run-of-three bug). Then 4. Result [1,2,3,4]. Note the head never needs protection here: dedup-keep-one ALWAYS keeps the first occurrence, so the head always survives and no dummy is needed — unlike "delete every node whose value repeats", where the head itself can go and the dummy/prev pattern from page 3 becomes mandatory.',
  },
  {
    id: 'll-q-dedup-fill', topic: T, page: 'two-lists', kind: 'fill', difficulty: 'medium',
    title: 'Unsorted dedup with a seen-set',
    prompt: 'Complete the unsorted dedup (preserve first-occurrence order).',
    lang: 'cpp',
    code: `
ListNode* dedupUnsorted(ListNode* head) {
    unordered_set<int> seen;
    ListNode dummy(0); dummy.next = head;
    ListNode* prev = &dummy;
    while (prev->next) {
        if ([[0]])
            prev->next = prev->next->next;   // prev stays put
        else {
            [[1]];
            prev = prev->next;
        }
    }
    return [[2]];
}`,
    blanks: [
      ['seen.count(prev->next->val)', 'seen.contains(prev->next->val)', 'seen.count(prev -> next -> val)'],
      ['seen.insert(prev->next->val)', 'seen.insert(prev->next->val)', 'seen.emplace(prev->next->val)'],
      ['dummy.next'],
    ],
    explain: 'The candidate is always prev->next (the prev-walk discipline), the set is consulted per node — one O(1)-average lookup each, O(n) total — and a surviving node’s value is registered before prev advances. prev NOT advancing after an unlink is what handles consecutive duplicates; the dummy covers "the head itself is a duplicate". Costs: O(n) time, O(n) space for the set. If extra space is banned, the fallback is nested comparison — O(n2) time, O(1) space — and saying that trade out loud is part of the answer. In C there is no std hash set: you write a small open-addressed table (Hashing topic) or accept the O(n2) walk.',
  },
  {
    id: 'll-q-two-multi', topic: T, page: 'two-lists', kind: 'multi', difficulty: 'medium',
    title: 'Two-list discipline',
    prompt: 'Select every TRUE statement.',
    options: [
      'Two nodes holding equal values are NOT an intersection — intersection means shared MEMORY, so comparisons must be on pointers/identity.',
      'The hash-set method for intersection (store A’s nodes, walk B) is O(n + m) time and O(n) space — a correct first answer before the O(1)-space switch.',
      'dedupSorted needs a dummy head because the head node might be deleted.',
      'In Python, the intersection loop must compare with `is not`, not `!=`, to compare identity rather than invoking __eq__.',
      'The alignment method (count lengths, start the longer pointer |na − nb| ahead, walk lockstep) is also O(n + m) time and O(1) space.',
    ],
    answers: [0, 1, 3, 4],
    explain: 'Identity-vs-value is the trap the problem exists to test; the set is the honest first answer; Python’s `==` can invoke a user-defined __eq__, so identity needs `is`; the alignment method is the other O(1)-space route (two counting passes, slightly more code, slightly easier to explain — know both). FALSE: dedupSorted’s head ALWAYS survives (keep-one keeps the first occurrence, and the head IS a first occurrence), so no dummy is needed — a dummy becomes mandatory only for the delete-all-duplicates variant.',
  },
  {
    id: 'll-q-int-length', topic: T, page: 'two-lists', kind: 'mcq', difficulty: 'easy',
    title: 'Measuring the shared tail',
    prompt: 'You have found the intersection node s of two lists. What is the cheapest way to get the LENGTH of the shared part?',
    options: [
      'Re-run the switch algorithm counting rounds',
      'Walk from s to null counting nodes — the shared part is exactly s’s chain to the end, O(c) time, O(1) space',
      'Subtract the stem lengths from the total lengths, which requires counting both lists again',
      'It cannot be done in O(1) space',
    ],
    answer: 1,
    explain: 'Once s is in hand, "the shared tail" and "the rest of the list from s" are the SAME chain — every node from s to the end belongs to both lists (that is what intersecting means: a Y, not a crossing). So one walk from s, counting, gives c in O(c) ≤ O(n) time and O(1) space. Option 3 also works but pays two extra full counts for the same number. This is the standard act-three follow-up after "find the intersection node", and the observation that makes it trivial — from the intersection node there is only ONE list left — is the point.',
  },

  // ── Regrouping & splicing
  {
    id: 'll-q-pairs-trace', topic: T, page: 'regrouping', kind: 'array', difficulty: 'easy',
    title: 'Swap pairs trace',
    prompt: 'swapPairs runs on [1, 2, 3, 4, 5]. List the final values head→tail.',
    answer: [2, 1, 4, 3, 5],
    placeholder: 'e.g. 2, 1, 4',
    hint: 'The loop needs TWO nodes after prev to start a pair; the leftover fifth node is never touched.',
    explain: 'Pair (1,2) flips to 2,1 with three writes (a.next ← b.next; b.next ← a; prev.next ← b), prev hops to a = node 1; pair (3,4) flips to 4,3; now prev->next is 5 with prev->next->next null — the guard refuses the partial pair and node 5 stays put. Result [2,1,4,3,5]. Nodes, not values: swapping val fields passes the same tests but breaks the moment anything holds pointers INTO the list (an index, a map value, an iterator) or nodes carry satellite data — and the relinking version is the one that generalises to k-groups.',
  },
  {
    id: 'll-q-oddeven-trace', topic: T, page: 'regrouping', kind: 'array', difficulty: 'easy',
    title: 'Odd-even by POSITION',
    prompt: 'oddEven (odd POSITIONS first: 1st, 3rd, 5th..., then even positions) runs on [10, 20, 30, 40, 50]. List the final values head→tail.',
    answer: [10, 30, 50, 20, 40],
    placeholder: 'e.g. 10, 30, 50',
    hint: 'The values are irrelevant — position 1,3,5 hold 10, 30, 50.',
    explain: 'Positions, not values: the 1st/3rd/5th nodes (10, 30, 50) thread onto the odd chain, the 2nd/4th (20, 40) onto the even chain, and one write (odd.next ← evenHead) concatenates: [10, 30, 50, 20, 40]. The famous misread is treating "odd-even" as odd VALUES — restate the definition out loud before coding. Mechanically: odd jumps over each even node (odd.next ← even.next), even jumps over each odd, the guard `even && even->next` protects the stride because even is the pointer that can run out mid-round (on this 5-node list the loop stops when even = 40 and even.next is null... precisely when even.next becomes null after the last jump).',
  },
  {
    id: 'll-q-partition-trace', topic: T, page: 'regrouping', kind: 'array', difficulty: 'medium',
    title: 'Stable partition trace',
    prompt: 'partition(head, 3) routes values < 3 to the less chain and ≥ 3 to the geq chain, preserving arrival order in each, then concatenates less + geq. Input: [1, 4, 3, 2, 5, 2]. List the final values head→tail.',
    answer: [1, 2, 2, 4, 3, 5],
    placeholder: 'e.g. 1, 2, 2',
    hint: 'less collects 1, 2, 2 in arrival order; geq collects 4, 3, 5 in arrival order.',
    explain: 'Walking the input: 1 → less; 4 → geq; 3 → geq (3 ≥ 3 — equal goes RIGHT, the standard convention); 2 → less; 5 → geq; 2 → less. less = [1,2,2], geq = [4,3,5], concatenated: [1,2,2,4,3,5]. Because each chain is grown by appending in arrival order, relative order within each group is PRESERVED — list partition is stable for free, unlike quicksort’s array partition which swaps across the pivot. The seal (`geq.next = null`) is mandatory: node 5 still carries its old next... here null by luck, but in general the last routed node points back into the input sequence — a cycle or duplicated tail without the seal.',
  },
  {
    id: 'll-q-rotate-numeric', topic: T, page: 'regrouping', kind: 'numeric', difficulty: 'medium',
    title: 'Rotate: count the hops',
    prompt: 'rotateRight on a 9-node list with k = 12: first k ← k mod n, then close the ring, walk to the new tail, cut. How many hops does the walk to the new tail take?',
    answer: 5,
    hint: 'k mod 9 = 3; the walk from head to the new tail is n − k − 1 hops.',
    explain: 'k ← 12 mod 9 = 3 (rotating by the length is a no-op, so only the remainder matters — skipping this step makes the walk count n − k − 1 = −4, and negative loop bounds silently do nothing, returning an unrotated list). The new tail is the node at position n − k = 6 (1-based), reached from head in n − k − 1 = 5 hops; then two writes: newTail.next ← null (the cut) and return its old next as the new head. Zero nodes moved — the ring close makes the wrap-around an existing pointer instead of a special case. Total: one counting pass + ≤ n hops, O(n) time, O(1) space.',
  },
  {
    id: 'll-q-reorder-order', topic: T, page: 'regrouping', kind: 'order', difficulty: 'medium',
    title: 'Reorder: the composition, in order',
    prompt: 'Order the phases of reorder L0→Ln→L1→Ln−1→… (the capstone: middle, reverse, zip).',
    items: [
      'Find the middle with fast/slow and cut the list into two halves',
      'Reverse the SECOND half (the back half must become walkable — you cannot walk backwards)',
      'Zip: save both successors (t1 = first.next, t2 = second.next) BEFORE any write',
      'Write first.next ← second and second.next ← t1, then advance first ← t1, second ← t2',
      'Stop when the second (shorter-or-equal) chain exhausts',
    ],
    explain: 'The capstone uses nothing new: middle (page 6), reverse (page 5), threading (this page). The zip’s save-both-successors rule is the read-before-write discipline at its sharpest: writing first.next ← second before saving t1 destroys first’s route onward and truncates the list. The stop rule rides the SHORTER chain: with the next-next guard the second half holds ⌊n/2⌋ nodes (odd n leaves the middle in the first half), so driving the loop by `while (second)` interleaves correctly for both parities — on odd n the loop ends with second exhausted and the middle node already threaded as first’s last link. Say the three phases out loud before coding: interviewers often stop you there, because the plan IS the answer.',
  },
  {
    id: 'll-q-regroup-fill', topic: T, page: 'regrouping', kind: 'fill', difficulty: 'medium',
    title: 'Seal, concatenate, return',
    prompt: 'Complete the tail of the stable partition (both chains have been grown; less/geq are their tails; lessD/geqD their dummies).',
    lang: 'cpp',
    code: `
[[0]];                        // SEAL the geq chain
[[1]];                        // concatenate
return [[2]];`,
    blanks: [
      ['geq->next = nullptr', 'geq->next=nullptr', 'geq->next = NULL', 'geq->next = null'],
      ['less->next = geqD.next', 'less->next=geqD.next'],
      ['lessD.next'],
    ],
    explain: 'The seal first: the last node routed to geq still carries its OLD next from the input — left alone it re-drags part of the input into the output (duplicated nodes or a cycle, often intermittent-looking and maddening to debug). Then one concatenation write from lessTail to the geq chain’s first REAL node (geqD.next — the dummy itself must never enter the answer). The head is lessD.next, which is correct even when the less chain is empty (then the answer is just the geq chain). Every threading algorithm ends with this exact trio: seal every grown tail, concatenate, return the dummy’s next — never a tail pointer.',
  },
  {
    id: 'll-q-regroup-multi', topic: T, page: 'regrouping', kind: 'multi', difficulty: 'hard',
    title: 'Threading discipline',
    prompt: 'Select every TRUE statement about the regrouping algorithms.',
    options: [
      'Any chain you grow must be SEALED (tail.next ← null) before it goes into the answer — an unsealed tail keeps its old next and re-drags input nodes.',
      'swapPairs by swapping val fields is equivalent to relinking whenever nodes carry only an int.',
      'The odd-even loop guard tests `even && even->next` because even is the pointer that can run out mid-stride.',
      'In the reorder zip, saving both successors before writing is optional if you advance the pointers carefully.',
      'rotateRight must reduce k mod n first; otherwise the walk count n − k − 1 can be negative and silently do nothing.',
      'List partition preserves relative order within both groups (stability) without any extra work.',
    ],
    answers: [0, 1, 2, 4, 5],
    explain: 'Seal-then-concatenate is the invariant of every threading algorithm; with int-only nodes value-swapping produces the identical list (but say "nodes, not values" anyway — the moment satellite data or outside pointers exist, it is wrong, and the relink version is what generalises to k-groups); the even pointer is the fragile one in odd-even (guarding on odd->next dereferences null on even-length lists); k %= n prevents the negative-walk no-op; and arrival order in each grown chain IS the original order — stability for free. FALSE: saving both successors in the zip is NEVER optional — first.next ← second overwrites the only route to t1; "advancing carefully" cannot recover a pointer that was never read.',
  },
]
