import type { Question } from '../../../questions/types'

const T = 'linked-lists'

export const questions2: Question[] = [
  // ── Reversal
  {
    id: 'll-q-rev-trace', topic: T, page: 'reversal', kind: 'array', difficulty: 'easy',
    title: 'Mid-reversal snapshot',
    prompt: 'The iterative reversal runs on [5, 6, 7, 8]. After exactly TWO full loop iterations (two flips and two advances), what are the values of `prev` and `cur`, in that order? (Write null as -1.)',
    answer: [6, 7],
    placeholder: 'two values, e.g. 6, 7',
    hint: 'Each iteration flips one node into the reversed part and slides the boundary one node right.',
    explain: 'Iteration 1: save 6, flip 5.next ← null, prev = 5, cur = 6. Iteration 2: save 7, flip 6.next ← 5, prev = 6, cur = 7. So prev = 6 (head of the reversed part 6→5) and cur = 7 (the boundary — everything from cur on is still untouched). The invariant reads directly off the two values: left of cur reversed, right untouched, prev the last flipped. If you got prev = 7, you advanced before flipping.',
  },
  {
    id: 'll-q-rev-invariant', topic: T, page: 'reversal', kind: 'mcq', difficulty: 'medium',
    title: 'The sentence that makes reversal correct',
    prompt: 'Which is the loop invariant of the three-pointer reversal?',
    options: [
      'cur is always the middle of the list',
      'Every node before cur points at its predecessor; every node from cur on is untouched; prev is the last node flipped',
      'prev and cur are always adjacent in the ORIGINAL order',
      'The list is sorted after each iteration',
    ],
    answer: 1,
    explain: 'That three-part sentence is the invariant: it is true before the first iteration (zero nodes flipped), each iteration extends it one node right (save nxt, flip cur, advance both), and at termination (cur = null) it says every node is flipped — with prev, the last node processed, being the original tail = the new head. Option 3 is accidentally true but useless (it doesn’t say anything about the arrows); the whole proof rides on option 2. Stating YOUR invariant before coding is the habit the interview is actually testing.',
  },
  {
    id: 'll-q-rev-rec-crash', topic: T, page: 'reversal', kind: 'mcq', difficulty: 'easy',
    title: 'Recursion’s bill',
    prompt: 'Recursive reversal is called on a 100,000-node list with a default ~1 MB stack. What happens?',
    options: [
      'It works — recursion is O(1) space',
      'Stack overflow / StackOverflowError: one frame per node, ~10⁵ frames deep',
      'It works but returns the list unreversed',
      'It runs in O(log n) space like merge sort',
    ],
    answer: 1,
    explain: 'Recursive reversal nests one call per node: depth = n = 100,000 frames, each dozens of bytes — far past a default ~1 MB stack (which holds roughly 10⁴–10⁵ frames). The result is a crash, not a slowdown: Java throws StackOverflowError, C/C++ segfaults, Python raises RecursionError at its 1000-frame default limit unless you raise it. Contrast merge sort on lists: depth log n ≈ 17 for 100,000 — always safe. "Which list recursions are depth-n and which are depth-log-n?" is a real interview discriminator.',
  },
  {
    id: 'll-q-rev-fill', topic: T, page: 'reversal', kind: 'fill', difficulty: 'easy',
    title: 'The reversal template',
    prompt: 'Complete the iterative reversal.',
    lang: 'cpp',
    code: `
ListNode* reverse(ListNode* head) {
    ListNode *prev = nullptr, *cur = head;
    while (cur) {
        ListNode* nxt = [[0]];
        [[1]];
        prev = cur;
        cur = nxt;
    }
    return [[2]];
}`,
    blanks: [
      ['cur->next', 'cur -> next'],
      ['cur->next = prev', 'cur->next=prev'],
      ['prev'],
    ],
    explain: 'Save cur->next BEFORE the flip (it is the only route from the reversed region into the untouched one), flip cur->next ← prev, advance both, and return prev — at termination prev is the last node processed, the original tail, hence the new head. Returning `head` gives the caller the OLD tail, which now ends the reversed list. This exact template also powers reverse-between, k-groups, palindrome and reorder — own it cold.',
  },
  {
    id: 'll-q-rev-between-numeric', topic: T, page: 'reversal', kind: 'numeric', difficulty: 'medium',
    title: 'reverseBetween trace',
    prompt: 'After `reverseBetween(head, 2, 5)` on [1, 2, 3, 4, 5, 6], what is the value of the node at 1-based position 4?',
    answer: 3,
    hint: 'Positions 2–5 become 5, 4, 3, 2; positions 1 and 6 never move.',
    explain: 'The range [2, 5] holds 2, 3, 4, 5; reversed it is 5, 4, 3, 2, so the list becomes [1, 5, 4, 3, 2, 6] and position 4 holds 3. Internally: the anchor sits at position 1, exactly n − m + 1 = 4 flips run, then the two stitches (anchor.next ← prev = node 5; rangeHead (node 2).next ← cur = node 6). Tracking which node is rangeHead (the ORIGINAL head of the range, now its tail) is the bookkeeping the whole problem tests.',
  },
  {
    id: 'll-q-rev-kgroup-multi', topic: T, page: 'reversal', kind: 'multi', difficulty: 'hard',
    title: 'k-group reversal facts',
    prompt: 'For "reverse nodes in k-groups, leaving a partial final group alone", select every TRUE statement.',
    options: [
      'Probing k nodes ahead before flipping guarantees the flip never runs off the end of the list.',
      'After exactly k flips, prev is the group’s new head and cur is the first node AFTER the group.',
      'The back stitch uses the group’s ORIGINAL head (now its tail): groupTail.next ← cur.',
      'Each node is visited at most twice overall (once by a probe, once by a flip), so the algorithm is O(n).',
      'If n is not a multiple of k, the leftover nodes must be reversed too.',
      'k = 2 makes the algorithm identical in effect to swap-pairs.',
    ],
    answers: [0, 1, 2, 3, 5],
    explain: 'The probe is what makes the fixed-count flip safe — skipping it is the "works except when n % k ≠ 0" bug. The flip’s endpoint semantics (prev = new head, cur = first node after) and the two stitches (front to prev, back from the ORIGINAL head) are the algorithm’s whole bookkeeping. Touch counts: probe once, flip once ⇒ O(n) time, O(1) space. Option 5 is true: k = 2 reverses each pair = swaps each pair. Option 4 is FALSE as stated: the standard version leaves the partial group as-is — reversing it is the named VARIANT ("reverse the remainder too"), and knowing which is which is part of the question.',
  },
  {
    id: 'll-q-rev-order', topic: T, page: 'reversal', kind: 'order', difficulty: 'medium',
    title: 'reverseBetween in order',
    prompt: 'Order the steps of reverseBetween(head, m, n).',
    items: [
      'Anchor a pointer at position m−1 (dummy makes m = 1 safe)',
      'Remember rangeHead ← anchor.next (the range’s original head)',
      'Run the three-pointer flip exactly n − m + 1 times',
      'Stitch front: anchor.next ← prev',
      'Stitch back: rangeHead.next ← cur',
    ],
    explain: 'Anchor → bookmark → counted flips → two stitches. The bookmark must happen BEFORE the flips (after them the original head is the range’s TAIL and is hard to find), and the flip count is exactly the range size — one flip fewer leaves the range’s tail pointing backwards into the range, one more flips a node that should stay put. Both stitches are single writes; after them the list is whole again and the answer is dummy.next.',
  },
  {
    id: 'll-q-rev-doubly', topic: T, page: 'reversal', kind: 'mcq', difficulty: 'medium',
    title: 'Reversing a doubly list',
    prompt: 'What must a correct reversal of a DOUBLY linked list do beyond flipping next pointers?',
    options: [
      'Nothing — next pointers are enough',
      'Swap prev and next in EVERY node, and exchange the head and tail pointers',
      'Only reverse the prev pointers',
      'Rebuild the list from an array',
    ],
    answer: 1,
    explain: 'In a doubly list the arrows carry the order in BOTH directions: after reversal, what was prev becomes next and vice versa, so each node swaps its two pointers (one pass: `swap(u->prev, u->next)` while walking), and the roles of head and tail exchange (the old tail is the new head). Flipping only next leaves every prev pointing the wrong way — forward traversal looks reversed, backward traversal still yields the original order, and the prev/next agreement invariant (u.next = v ⟺ v.prev = u) is broken everywhere. Option 1 is the singly-list answer and a favourite trap.',
  },

  // ── Fast and slow pointers
  {
    id: 'll-q-fs-middle-trace', topic: T, page: 'fast-slow-pointers', kind: 'array', difficulty: 'easy',
    title: 'Watch slow move',
    prompt: 'On [4, 7, 1, 2, 9], the middle loop (`while (fast && fast.next)`, both starting at head) runs. List the values slow holds at the START of the algorithm and after each round, in order.',
    answer: [4, 7, 1],
    placeholder: 'e.g. 4, 7, 1',
    hint: 'slow moves one node per round; fast’s index is always twice slow’s.',
    explain: 'Start: slow = fast = 4 (indices 0, 0). Round 1: slow → 7 (index 1), fast → 1 (index 2). Round 2: slow → 1 (index 2), fast → 9 (index 4) — now fast.next is null, the guard fails, loop ends. slow = 1, the unique middle of 5 nodes (index 2 = ⌊5/2⌋). The invariant f = 2s held at every frame: 0=2·0, 2=2·1, 4=2·2. For odd n the two candidate middles coincide, so this guard’s even-list choice (second middle) never shows.',
  },
  {
    id: 'll-q-fs-even', topic: T, page: 'fast-slow-pointers', kind: 'mcq', difficulty: 'medium',
    title: 'Which middle on an even list?',
    prompt: 'On [1, 2, 3, 4, 5, 6] with `slow = fast = head; while (fast && fast->next) { slow = slow->next; fast = fast->next->next; }` — where does slow stop?',
    options: ['3 (the first middle)', '4 (the second middle)', '2', 'null — the loop crashes'],
    answer: 1,
    explain: 'Rounds: slow 1→2→3→4 while fast 1→3→5→null; when fast is null the guard fails and slow sits on 4 — the SECOND of the two middles (index 3 = n/2). Starting `fast = head->next` instead stops slow at 3 (the first middle). Neither is "wrong" — the guard is a CHOICE, and each algorithm needs a specific one: merge-sort splitting wants the END OF THE FIRST HALF (first middle: fast one ahead, or the next-next guard), palindrome comparison wants either with a matching comparison loop. Saying which middle your guard produces, unprompted, is the credibility move.',
  },
  {
    id: 'll-q-fs-gap-numeric', topic: T, page: 'fast-slow-pointers', kind: 'numeric', difficulty: 'medium',
    title: 'The fixed gap, counted',
    prompt: 'A 12-node list, nthFromEnd with n = 4 (first walks 4 ahead, then both slide until first = null). How many steps does `second` take during the sliding phase?',
    answer: 8,
    hint: 'first starts the slide at index 4 and must reach index 12 (null, one past the tail).',
    explain: 'After the opening walk first is at index 4; reaching null (index 12) takes 12 − 4 = 8 steps, and second — moving in lockstep — takes the same 8, landing at index 8, which is the 4th node from the end (indices 8, 9, 10, 11 are the last four). The invariant is the whole method: gap = firstIdx − secondIdx = n forever, so first falling off the end (index = length) forces secondIdx = length − n. Each node is touched at most twice, in ONE stream — no length counter anywhere.',
  },
  {
    id: 'll-q-fs-delete-fill', topic: T, page: 'fast-slow-pointers', kind: 'fill', difficulty: 'medium',
    title: 'Delete nth from the end, one pass',
    prompt: 'Complete the one-pass deletion (n is valid: 1 ≤ n ≤ length). The gap must leave `second` on the node BEFORE the victim.',
    lang: 'cpp',
    code: `
ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* first = &dummy;
    for (int i = 0; i < [[0]]; i++)       // gap of n + 1 from second
        first = first->next;
    ListNode* second = &dummy;
    while ([[1]]) {
        first = first->next;
        second = second->next;
    }
    [[2]];                                // unlink the victim
    return dummy.next;
}`,
    blanks: [
      ['n + 1', 'n+1'],
      ['first', 'first != nullptr', 'first != NULL'],
      ['second->next = second->next->next', 'second->next=second->next->next'],
    ],
    explain: 'Deletion needs the PREDECESSOR of the victim, so the gap is n + 1 (not n): when first falls off the end, second sits on the node before the nth-from-end. The dummy is mandatory — the victim may be the head (n = length), and then the "predecessor" is the dummy itself. The unlink is the standard skip-over. Compare with pure LOOKUP (return the node): gap n, no dummy needed. Knowing why the gap differs by one between lookup and delete is exactly what this question tests.',
  },
  {
    id: 'll-q-fs-guard-multi', topic: T, page: 'fast-slow-pointers', kind: 'multi', difficulty: 'medium',
    title: 'Guard semantics',
    prompt: 'Both pointers start at head on a list of length n ≥ 1. Select every TRUE statement about the two guards.',
    options: [
      '`while (fast && fast->next)` stops slow at index ⌊n/2⌋ — the second middle on even n.',
      '`while (fast->next && fast->next->next)` stops slow at the node BEFORE the second half — index ⌈n/2⌉ − 1.',
      'The second guard is safe on a one-node list (the loop body never runs).',
      'The first guard crashes on a one-node list.',
      'Both guards find the middle in exactly n/2 rounds regardless of parity.',
    ],
    answers: [0, 1, 2],
    explain: 'Guard 1: f = 2s invariant, stop when 2s ≥ n−1 ⇒ s = ⌊n/2⌋ (even n: second middle; odd n: unique middle). Guard 2: it tests two steps ahead of fast, so on one node fast->next is null and the body never runs — safe, slow stays at head, which is exactly "the node before the second half" of a 1-node list (second half = that node). Guard 1 on one node: fast non-null but fast->next null — also safe, zero rounds (option 4 false). Round counts differ with parity: ⌊n/2⌋ for guard 1, ⌈n/2⌉−1 for guard 2 (option 5 false). Pick the guard from WHAT YOU NEED (the middle node vs the split point), then verify n = 1 and n = 2 by hand.',
  },
  {
    id: 'll-q-fs-onepass', topic: T, page: 'fast-slow-pointers', kind: 'mcq', difficulty: 'easy',
    title: 'When one pass is the only pass',
    prompt: 'Both nth-from-end methods are O(n) time and O(1) space. In which situation is the fixed-gap version not just preferable but NECESSARY?',
    options: [
      'When the list is sorted',
      'When the nodes are large',
      'When the "list" is a stream that can be read only once (or is expensive to re-read, e.g. from disk)',
      'When n is even',
    ],
    answer: 2,
    explain: 'The two-pass method needs the LENGTH before the second walk — it must see the whole sequence once just to count. If the sequence is a stream (network socket, iterator over a remote store, a tape) there is no second read: the gap trick keeps both walkers in one forward stream and never needs the length. This is the deep reason "one pass" is a category of its own in interviews, not a big-O nicety: same Θ(n), different ACCESS PATTERN. The same distinction powers sliding windows on arrays and reservoir sampling.',
  },
  {
    id: 'll-q-fs-split-2', topic: T, page: 'fast-slow-pointers', kind: 'mcq', difficulty: 'medium',
    title: 'The two-node split',
    prompt: 'Merge sort on a 2-node list splits with `slow = head, fast = head->next; while (fast && fast->next) {...}`. What are the two halves?',
    options: [
      '1 + 1 (correct termination)',
      '2 + 0 — the recursion receives the same list and never terminates',
      '0 + 2',
      'It crashes: fast->next->next dereferences null',
    ],
    answer: 0,
    explain: 'With fast starting ONE AHEAD, a 2-node list has fast = node 2 with fast->next = null: the guard fails immediately, slow stays at node 1, the cut gives [1] and [2] — both base cases, recursion ends. With fast = head instead, round 1 runs (fast = node 2 after one double-step... careful: fast = head, fast->next exists, so slow → node 2 and fast → null) — slow ends at node 2, the "first half" is the WHOLE list and the second half is empty: mergeSort receives the same 2-node list forever. That single starting position is the difference between a correct sort and an infinite recursion, which is why the n = 2 trace is the mandatory hand-check.',
  },

  // ── Cycle detection
  {
    id: 'll-q-cyc-gap', topic: T, page: 'cycle-detection', kind: 'numeric', difficulty: 'medium',
    title: 'The shrinking gap',
    prompt: 'Inside a cycle, the hare is currently 3 nodes ahead of the tortoise (measuring forward along the cycle). Each round the tortoise moves 1 and the hare 2. After how many rounds do they occupy the same node?',
    answer: 3,
    hint: 'The gap shrinks by exactly 1 per round: 3 → 2 → 1 → 0.',
    explain: 'Three rounds: the gap (hare − tortoise, mod cycle length) decreases by exactly 2 − 1 = 1 each round, so it walks 3 → 2 → 1 → 0 and they meet. The hare can never "hop over" the tortoise because the gap passes through every integer on the way down — this is the entire correctness proof of Floyd’s detection, and it is why the speed pair (1, 2) is special: gap shrinkage d = 1 always reaches 0, while a faster hare (d = 2) shrinks by 2 and needs gcd reasoning to guarantee a hit. Meeting happens within C rounds of the tortoise entering the cycle, so total time is O(L + C) = O(n).',
  },
  {
    id: 'll-q-cyc-entrance-numeric', topic: T, page: 'cycle-detection', kind: 'numeric', difficulty: 'medium',
    title: 'The entrance walk, counted',
    prompt: 'A list has stem L = 5 and cycle length C = 7; Floyd’s pointers meet at the node m = 2 positions into the cycle. In phase 2, p starts at head and q at the meeting point, both walking one step per round. After how many steps do they meet?',
    answer: 5,
    hint: 'L = jC − m means walking L steps from EITHER starting point lands on the entrance.',
    explain: 'Five steps — both walkers arrive at the entrance simultaneously. From head: L = 5 steps lands on the entrance by definition. From the meeting point: the meeting condition is L + m ≡ 0 (mod C) — here 5 + 2 = 7 = 1·C — so L = jC − m for some whole number of laps j. Walking jC − m steps from a point m positions into the cycle means backing up m steps to the entrance, then completing j full laps: you land exactly ON the entrance. They meet there and nowhere earlier: q stays inside the cycle while p is still on the stem (they cannot coincide off the entrance), and once p enters the cycle both are locked to the same node. Total algorithm: ≤ (L + C) + L steps, O(1) space.',
  },
  {
    id: 'll-q-cyc-guard-fill', topic: T, page: 'cycle-detection', kind: 'fill', difficulty: 'easy',
    title: 'Floyd, complete',
    prompt: 'Complete detect-and-locate.',
    lang: 'cpp',
    code: `
ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while ([[0]] && [[1]]) {
        slow = slow->next;
        fast = fast->next->next;
        if ([[2]]) {
            ListNode* p = head;
            while (p != slow) {
                p = p->next;
                [[3]];
            }
            return p;
        }
    }
    return nullptr;
}`,
    blanks: [
      ['fast', 'fast != nullptr', 'fast != NULL'],
      ['fast->next', 'fast->next != nullptr', 'fast->next != NULL'],
      ['slow == fast'],
      ['slow = slow->next', 'slow=slow->next'],
    ],
    explain: 'Guard order matters: `fast` first, `fast->next` second — reversed, the second clause dereferences null when fast IS null (short-circuit evaluation saves you only in the written order). The meeting test compares POINTERS after the moves (testing before any move is trivially true — both start at head). Phase 2 walks both pointers one step per round until they coincide at the entrance. The whole function is O(n) time, O(1) space, no visited set.',
  },
  {
    id: 'll-q-cyc-values', topic: T, page: 'cycle-detection', kind: 'mcq', difficulty: 'easy',
    title: 'The fake cycle',
    prompt: 'A buggy hasCycle compares node VALUES instead of pointers (`if (slow->val == fast->val) return true;`). On which acyclic list does it report a cycle that does not exist?',
    options: ['[1, 2, 3, 4]', '[1, 2, 2, 3]', '[7, 7]', 'Any list with two equal values anywhere'],
    answer: 1,
    explain: 'Trace [1, 2, 2, 3]: after round 1, slow sits on index 1 and fast on index 2 — DIFFERENT nodes that both hold 2, so the buggy test fires and the function returns true on a perfectly linear list. Note what the other options show: [7, 7] does NOT trigger it (after one move slow is on the second 7 and fast is null — the guard exits first), and equal values merely EXISTING somewhere is not enough — the walkers must LAND on them in the same round. So the bug is input-parity-dependent and intermittent: the worst kind. The fix is identity comparison: == on pointers/references in C++/Java/C IS address comparison; Python must use `is` (since `==` may invoke a user-defined __eq__). "Two nodes with equal values are not the same node" — the identity-vs-value discipline the intersection problem tests too.',
  },
  {
    id: 'll-q-cyc-length', topic: T, page: 'cycle-detection', kind: 'mcq', difficulty: 'medium',
    title: 'Measuring the cycle',
    prompt: 'Floyd’s pointers have just met inside a cycle. What is the O(1)-space way to get the cycle LENGTH?',
    options: [
      'Count all nodes from head until null',
      'Freeze one pointer at the meeting node, walk the other around until it returns, counting steps',
      'Subtract the stem length from the list length',
      'Restart both pointers from head and count until they meet again',
    ],
    answer: 1,
    explain: 'Keep q parked at the meeting node; walk p one step at a time until p == q again — the step count is exactly C, because inside a cycle "returning to a fixed node" means completing one full lap. Cost: O(C) ≤ O(n) extra steps, no memory. Option 3 needs both quantities first (you can get n by walking... which never terminates on a cyclic list — you must detect first). Option 4 re-runs detection, which meets somewhere else and counts nothing clean. A favourite act-three follow-up after "does it cycle?" and "where does it start?".',
  },
  {
    id: 'll-q-cyc-multi', topic: T, page: 'cycle-detection', kind: 'multi', difficulty: 'medium',
    title: 'Cycle-detection facts',
    prompt: 'Select every TRUE statement.',
    options: [
      'If a cycle exists, the hare can never fall off the end — every next inside a cycle stays inside it.',
      'The meeting point is always the cycle’s entrance.',
      'A hash set of visited nodes detects a cycle in O(n) time and O(n) space.',
      'Floyd’s detection plus entrance-finding is O(n) time and O(1) space.',
      'Marking nodes with a visited flag is O(1) space and always allowed.',
      'On an acyclic list the loop exits because fast (or fast->next) becomes null.',
    ],
    answers: [0, 2, 3, 5],
    explain: 'The hare is trapped once it enters (closes the argument for "they MUST meet"); the set and Floyd are the two standard costs; the acyclic exit is the null guard. FALSE: the meeting point is the entrance only when L ≡ 0 (mod C) — usually it is somewhere else inside the cycle, which is exactly why phase 2 exists. And flag-marking MUTATES the input: it changes every node’s bytes, breaks concurrent readers, and is disqualified unless the interviewer explicitly permits it — saying "that trades correctness-of-the-input for space" is the senior observation.',
  },
  {
    id: 'll-q-cyc-brent', topic: T, page: 'cycle-detection', kind: 'mcq', difficulty: 'hard',
    title: 'Brent’s improvement',
    prompt: 'Brent’s cycle detection keeps ONE pointer moving and periodically teleports the other. What is its advantage over Floyd?',
    options: [
      'It is O(log n) instead of O(n)',
      'Fewer pointer dereferences per step (the moving pointer advances 1 per round instead of two advancing 2+1), a measurably better constant when nodes are cache-cold — same O(n)/O(1)',
      'It finds the entrance without phase 2',
      'It works on doubly linked lists only',
    ],
    answer: 1,
    explain: 'Brent: fast advances one node per round, counting; every time the count reaches a power of two, slow teleports to fast’s position and the count resets. If a cycle exists, fast eventually laps the parked slow (the gap argument again, with parking instead of 2× speed). Asymptotics are identical — O(n) time, O(1) space — but the arithmetic is per single-pointer advance: roughly 2/3 the pointer loads of Floyd’s 3-per-round, which matters precisely when each load is a cache miss. It also yields the cycle length directly (the count at the meeting). Naming Brent in an interview is a cheap, real signal.',
  },

  // ── Palindrome & halves
  {
    id: 'll-q-pal-guard', topic: T, page: 'palindrome-halves', kind: 'mcq', difficulty: 'medium',
    title: 'The splitting guard',
    prompt: 'The palindrome algorithm needs slow to stop at the node BEFORE the second half (so slow->next can be reversed and the halves compared). Which guard delivers that?',
    options: [
      'while (fast && fast->next)',
      'while (fast->next && fast->next->next)',
      'while (fast)',
      'while (slow->next)',
    ],
    answer: 1,
    explain: 'The next-next guard tests two steps ahead of fast, so it stops with slow at index ⌈n/2⌉ − 1 — the node BEFORE the second half (on odd n that node IS the middle, which then rides in the first half and is never compared — harmless, since it mirrors itself). Guard 1 (`fast && fast->next`) puts slow AT the second middle on even lists: reversing from slow->next leaves only n/2 − 1... precisely, on n = 6 it reverses just indices 4–5, so the comparison covers only TWO of the three mirror pairs — [1, 2, 9, 8, 2, 1] sails through as a false TRUE (pairs (1,1) and (2,2) match; the mismatching pair (9,8) is never examined). Guard 3 never stops until null — useless. The hand-check discipline: run your chosen guard on n = 1, 2, 3 AND on a 6-node non-palindrome before trusting it.',
  },
  {
    id: 'll-q-pal-trace', topic: T, page: 'palindrome-halves', kind: 'array', difficulty: 'medium',
    title: 'The comparison pairs',
    prompt: 'On [1, 2, 3, 2, 1]: the second half is reversed and q walks it from its new head while p walks from the list head. List the values q visits, in order, until it exhausts.',
    answer: [1, 2],
    placeholder: 'e.g. 1, 2',
    hint: 'The next-next guard leaves slow ON the middle (index 2) — the second half is what comes AFTER it.',
    explain: 'The guard leaves slow at index 2 (value 3 — the middle itself), so the second half is [2, 1] (indices 3, 4); reversed it runs 1 → 2. q visits 1, 2 while p visits 1, 2 — two mirror pairs, (node 0, node 4) and (node 1, node 3). The middle (node 2) is NEVER compared — it rides in the first half and mirrors itself, so skipping it costs nothing. q’s exhaustion is the stop rule: q walks the ⌊n/2⌋-node half, and when it ends every mirror pair (i, n−1−i) has been covered. On a mismatch the function returns false immediately — and the restore (reverse the half back, relink) must run on the failure path too, or the caller’s list stays mutated.',
  },
  {
    id: 'll-q-pal-restore', topic: T, page: 'palindrome-halves', kind: 'mcq', difficulty: 'easy',
    title: 'Putting it back',
    prompt: 'After comparing, the O(1)-space palindrome check restores the list by...',
    options: [
      'Rebuilding it from the values',
      'Reversing the second half again and relinking it after slow',
      'Doing nothing — reversal is self-undoing',
      'Recursion unwinding the flips',
    ],
    answer: 1,
    explain: 'Reverse the (already reversed) second half once more — it returns to its original order — and set slow->next to its head. Two reversals, still O(n) time and O(1) space. Why bother: isPalindrome is a QUERY; a query that mutates its input is a design bug — the caller’s next traversal sees the list inside-out (judges that re-traverse after the query fail you on the spot). And the restore must run on BOTH exits — the mismatch early-return is exactly where people forget it. If the interviewer says mutation is fine, drop the restore and SAY you dropped it and why.',
  },
  {
    id: 'll-q-pal-fill', topic: T, page: 'palindrome-halves', kind: 'fill', difficulty: 'medium',
    title: 'Palindrome, O(1) space',
    prompt: 'Complete the comparison phase (slow already sits before the second half; `second` is the reversed half).',
    lang: 'cpp',
    code: `
ListNode* second = reverse(slow->next);
ListNode *p = head, *q = second;
bool ok = true;
while ([[0]]) {
    if ([[1]]) { ok = false; break; }
    p = p->next;
    q = q->next;
}
[[2]];                       // restore before returning
return ok;`,
    blanks: [
      ['q', 'q != nullptr', 'q != NULL'],
      ['p->val != q->val'],
      ['slow->next = reverse(second)', 'slow->next=reverse(second)'],
    ],
    explain: 'The loop is driven by q — the reversed second half, whose exhaustion means every mirror pair has been covered (on odd n the last pair is the middle vs itself, harmless). Driving by p instead walks p into the reversed half on odd lengths and compares unrelated nodes. The restore re-reverses and relinks in one expression; on the mismatch path the break still reaches it. Total: three linear phases (find split, reverse, compare) + one restore reversal — O(n) time, O(1) space, input left intact.',
  },
  {
    id: 'll-q-pal-odd-numeric', topic: T, page: 'palindrome-halves', kind: 'numeric', difficulty: 'medium',
    title: 'How big is the second half?',
    prompt: 'For a 9-node list, the next-next guard leaves slow at index 4 (the middle). How many nodes are in the second half (from slow->next to the tail)?',
    answer: 4,
    hint: 'Indices 5 through 8.',
    explain: 'Four: indices 5...8 (the list is indices 0...8; slow sits ON the middle at index 4, so slow->next starts the half at index 5). The halves are 5 and 4 — the middle rides in the FIRST half and is never compared, which is harmless because it mirrors itself. For even n = 2h the halves are h and h (slow stops at index h − 1, the last node of the first half). The general rule, easiest to remember operationally: q always walks exactly ⌊n/2⌋ nodes, and its exhaustion alone guarantees every mirror pair (i, n−1−i) has been covered.',
  },
  {
    id: 'll-q-pal-multi', topic: T, page: 'palindrome-halves', kind: 'multi', difficulty: 'medium',
    title: 'Palindrome approaches',
    prompt: 'Select every TRUE statement about checking whether a list is a palindrome.',
    options: [
      'Copying values to an array and two-pointering it is O(n) time, O(n) space — correct, and the right thing to state first.',
      'The recursive version (front pointer passed down the unwinding) is O(1) space.',
      'The middle+reverse+compare version is O(n) time, O(1) space.',
      'If the nodes are immutable, the O(1)-space reversal method is impossible.',
      'Restoring the list after the check costs another O(n) time.',
    ],
    answers: [0, 2, 3, 4],
    explain: 'The array fallback is the opening move (30 seconds, always correct); the reversal composition is the expected O(1)-space answer; immutability kills it (you cannot flip arrows you may not write — the array copy becomes the ONLY option, and knowing that boundary matters); restore is a second reversal of the half, O(n). FALSE: the recursive version carries a front pointer down n stack frames — O(n) stack space and the usual depth-n crash risk past ~10⁴–10⁵ nodes. "Elegant, but which version survives a million nodes?" is the follow-up that separates the three.',
  },
  {
    id: 'll-q-pal-recursive', topic: T, page: 'palindrome-halves', kind: 'mcq', difficulty: 'hard',
    title: 'The recursive trick',
    prompt: 'The recursive palindrome check passes a "front pointer" alongside the recursion. How does one unwinding frame perform its comparison?',
    options: [
      'It compares its own node with the node at the same depth from the front, found by walking',
      'The deepest frame holds the tail; each returning frame compares its node against *front and advances front — unwinding visits nodes back-to-front while front walks front-to-back',
      'It reverses the sublist below it',
      'It pushes values onto a stack',
    ],
    answer: 1,
    explain: 'The recursion itself walks to the tail (frames stack front-to-back); as it unwinds, each frame holds its node in back-to-front order while the shared front pointer (passed by reference) advances front-to-back — comparing the two sequences in lockstep, one pair per frame. If any pair mismatches, a false propagates up. Cost: O(n) time, O(n) STACK — beautiful, and a crash on long lists (depth n), which is why the iterative reverse-half version is the production answer. The same front-pointer-down-the-recursion shape solves "print a list backwards" and appears in tree problems (BST-to-sorted-list checks) — recursion as an implicit back-to-front iterator.',
  },
]
