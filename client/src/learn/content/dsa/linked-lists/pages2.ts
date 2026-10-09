import type { Page } from '../../../types'

/* ═══════════════════════════════ 5. Reversal ═══════════════════════════════ */

export const reversal: Page = {
  id: 'reversal',
  title: 'Reversal — the rite of passage',
  summary: 'Iterative reversal with its invariant and proof, the recursive version with the call stack cost, reversing a subrange with two stitches, and reversing in k-groups — the hard variant fully decomposed.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        Reversing a list is the most-asked linked-list question on earth, and the reason is instructive: it is the smallest problem where **pointer order is life or death**. Copying values into a reversed array is cheating (the interviewer means pointers); recursion hides the mechanism; only the three-pointer walk shows you actually understand what a pointer is.

        ## The iterative algorithm and its invariant

        Three pointers: \`prev\` (head of the reversed part), \`cur\` (the boundary), and \`nxt\` (a one-step lookahead).

        **Loop invariant.** *At the top of every iteration: every node before cur has its next pointing at its predecessor (the left part is reversed); every node from cur onward is untouched; prev is the last node reversed; and the reversed part's eventual head is prev.*

        **Proof of correctness.**
        - *Initialization:* prev = null, cur = head. Zero nodes reversed; nothing touched. True.
        - *Maintenance:* one iteration saves nxt = cur.next (the untouched part stays reachable), sets cur.next = prev (node cur joins the reversed part as its new front — its next now points at its predecessor), then advances prev ← cur, cur ← nxt. Both halves of the invariant hold one node further right.
        - *Termination:* cur = null means every node is left of the boundary, hence reversed; prev is the last node processed, i.e. the original tail — which is exactly the new head. Return prev. ∎

        Each iteration does exactly one link rewrite and moves the boundary one node, so n iterations, O(n) time; three pointers, **O(1) space**. The old tail's next was set to null when it was processed (prev was null then), so the reversed list terminates properly — no cycle, no dangling arrow.

        **The save-first rule, precisely.** Why must \`nxt = cur->next\` come before \`cur->next = prev\`? Because \`cur->next\` is the ONLY pointer from the reversed-so-far region into the untouched region. Overwriting it first makes the untouched nodes unreachable — not just "lost to the algorithm" but leaked (in C) or garbage (elsewhere). Read-before-write is not style; it is the reachability invariant.
      `,
    },
    {
      t: 'viz',
      algo: 'll-reverse-iter',
      caption: 'The boundary slides right one node per round: green = reversed (arrows point left), blue = cur, orange = the saved nxt. Watch the head pointer label move only at the very end.',
    },
    {
      t: 'code',
      title: 'Iterative reversal — the template you should be able to write half-asleep',
      code: {
        cpp: `ListNode* reverse(ListNode* head) {
    ListNode *prev = nullptr, *cur = head;
    while (cur) {
        ListNode* nxt = cur->next;   // save: only route into the untouched part
        cur->next = prev;            // flip: cur joins the reversed part
        prev = cur;                  // boundary slides…
        cur = nxt;                   // …one node right
    }
    return prev;                     // old tail = new head (old head now ends the list)
}`,
        java: `ListNode reverse(ListNode head) {
    ListNode prev = null, cur = head;
    while (cur != null) {
        ListNode nxt = cur.next;
        cur.next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}`,
        python: `def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev, cur = cur, nxt
    return prev`,
        js: `const reverse = (head) => {
    let prev = null, cur = head;
    while (cur) {
        const nxt = cur.next;
        cur.next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
};`,
        c: `struct Node* reverse(struct Node* head) {
    struct Node *prev = NULL, *cur = head;
    while (cur) {
        struct Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## The recursive version — and why interviews prefer the iterative one

        \`\`\`
        reverseRec(cur):
            if cur is null or cur.next is null: return cur     # base: last node is the new head
            newHead = reverseRec(cur.next)                     # the tail gets reversed first
            cur.next.next = cur                                # the node AFTER cur now points back at cur
            cur.next = null                                    # sever, or cur ⇄ cur.next is a 2-cycle
            return newHead
        \`\`\`

        The key insight is \`cur.next.next = cur\`: after the recursive call returns, \`cur.next\` is the *last* node of the reversed tail, and making it point back at cur appends cur to the end. The \`cur.next = null\` line is mandatory — without it every adjacent pair forms a two-node cycle.

        **Cost:** O(n) time, but **O(n) stack space** — a list of 100,000 nodes is 100,000 stack frames, which blows the default stack (~1 MB ⇒ ~10⁴–10⁵ frames) in every language. That is a crash, not a slowdown. Recursion on linked lists is fine for teaching and for guaranteed-short lists; production and interviews use the loop. The recursion animation below makes the stack visible — watch it grow to the base case, then unwind doing one "fold" per level.

        ## Reversing a subrange [m, n]

        The pattern extends: anchor a pointer at position m−1 (dummy makes m = 1 safe), run the three-pointer flip **exactly n−m+1 times**, then two stitches:

        - front: \`anchor.next ← prev\` (the range's new head),
        - back: \`rangeHead.next ← cur\` (the range's old head is now its tail; cur is the first node after the range).

        Bookkeeping is the whole difficulty: remember the range's original head (it becomes the tail) and notice that after the fixed number of flips, prev and cur are exactly the two ends of the reversed range. One pass, O(n) time, O(1) space.
      `,
    },
    {
      t: 'viz',
      algo: 'll-reverse-rec',
      caption: 'The call stack beside the list: it grows to the base case (last node = new head), then each returning frame performs one fold — cur.next.next = cur — and severs cur.next. Depth n is exactly why long lists crash with this version.',
    },
    {
      t: 'viz',
      algo: 'll-reverse-range',
      caption: 'Reverse positions 2–6: the anchor (orange) never moves, the highlighted window flips with exactly n−m+1 three-pointer steps, then the two stitches reconnect both ends. Try m = 1 (dummy pays off) and m = n = length (plain full reversal).',
    },
    {
      t: 'code',
      title: 'Reverse the sublist [m, n] (1-based, 1 ≤ m ≤ n ≤ length)',
      code: {
        cpp: `ListNode* reverseBetween(ListNode* head, int m, int n) {
    ListNode dummy(0); dummy.next = head;
    ListNode* anchor = &dummy;
    for (int i = 1; i < m; i++) anchor = anchor->next;   // position m−1
    ListNode *prev = nullptr, *cur = anchor->next;
    ListNode* rangeHead = cur;                           // will become the tail
    for (int i = 0; i < n - m + 1; i++) {                // EXACTLY that many flips
        ListNode* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    anchor->next = prev;                                 // stitch front
    rangeHead->next = cur;                               // stitch back
    return dummy.next;
}`,
        java: `ListNode reverseBetween(ListNode head, int m, int n) {
    ListNode dummy = new ListNode(0); dummy.next = head;
    ListNode anchor = dummy;
    for (int i = 1; i < m; i++) anchor = anchor.next;
    ListNode prev = null, cur = anchor.next;
    ListNode rangeHead = cur;
    for (int i = 0; i < n - m + 1; i++) {
        ListNode nxt = cur.next;
        cur.next = prev;
        prev = cur;
        cur = nxt;
    }
    anchor.next = prev;
    rangeHead.next = cur;
    return dummy.next;
}`,
        python: `def reverse_between(head, m, n):
    dummy = Node(0); dummy.next = head
    anchor = dummy
    for _ in range(m - 1):
        anchor = anchor.next
    prev, cur = None, anchor.next
    range_head = cur
    for _ in range(n - m + 1):
        nxt = cur.next
        cur.next = prev
        prev, cur = cur, nxt
    anchor.next = prev
    range_head.next = cur
    return dummy.next`,
        js: `const reverseBetween = (head, m, n) => {
    const dummy = new ListNode(0); dummy.next = head;
    let anchor = dummy;
    for (let i = 1; i < m; i++) anchor = anchor.next;
    let prev = null, cur = anchor.next;
    const rangeHead = cur;
    for (let i = 0; i < n - m + 1; i++) {
        const nxt = cur.next;
        cur.next = prev;
        prev = cur;
        cur = nxt;
    }
    anchor.next = prev;
    rangeHead.next = cur;
    return dummy.next;
};`,
        c: `struct Node* reverse_between(struct Node* head, int m, int n) {
    struct Node dummy = {0, NULL}; dummy.next = head;
    struct Node* anchor = &dummy;
    for (int i = 1; i < m; i++) anchor = anchor->next;
    struct Node *prev = NULL, *cur = anchor->next;
    struct Node* range_head = cur;
    for (int i = 0; i < n - m + 1; i++) {
        struct Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    anchor->next = prev;
    range_head->next = cur;
    return dummy.next;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Reverse in k-groups — the senior-engineer variant

        "Reverse every group of k consecutive nodes; leave a final partial group alone" combines everything above into one loop with real bookkeeping:

        1. **Probe** k nodes ahead of the anchor. Fewer than k remain? Stop.
        2. **Flip** exactly k with the three-pointer loop. After the k-th flip, prev = group's new head, cur = first node after the group.
        3. **Stitch front**: anchor.next ← prev. **Stitch back**: groupTail.next ← cur, where groupTail is the group's ORIGINAL head (remembered before flipping — it is now the tail).
        4. **Hop** the anchor to groupTail and repeat.

        *Invariant:* before each round, everything up to the anchor is finished and correct; the anchor is the tail of the finished prefix. The probe guarantees the flip never runs off the end, which is the bug people write when they skip step 1 ("works except when n is not a multiple of k").

        **Cost:** every node is touched at most twice (once by the probe, once by the flip), so O(n) time; pointers only, O(1) space. Variants to recognise: *reverse the partial group too* (run the flip on however many remain), *reverse alternating groups* (skip k after reversing k), *k = 2* is swap-pairs (page 9), and *reverse from node m to node n* is the subrange version above.
      `,
    },
    {
      t: 'viz',
      algo: 'll-reverse-k-group',
      caption: 'n = 9, k = 3: three full groups reverse, each with probe → k flips → two stitches → anchor hop. Set k = 2 for swap-pairs behaviour, k = length for full reversal, k > length for "nothing happens" (the probe rejects the only group).',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Reversal bugs people actually ship',
      md: `- Forgetting \`cur.next = null\` in the recursive version ⇒ every adjacent pair is a 2-cycle; traversal hangs.
- Flipping k+1 times in a k-group (loop bound off by one) ⇒ the group's tail leaks into the next group.
- In reverse-between, stitching with the group's NEW head instead of its ORIGINAL head ⇒ the tail of the range is orphaned.
- Reversing and forgetting to update the CALLER's head: \`reverse(head)\` returns the new head; ignoring the return value leaves you holding the old tail. In Java/Python/JS this must be \`head = reverse(head)\`.
- On a doubly list, reversing only the next pointers ⇒ backward traversal now walks the old order. A doubly reversal must swap prev/next in every node.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'reverse (iterative)', time: 'O(n)', space: 'O(1)', note: 'the template' },
        { op: 'reverse (recursive)', time: 'O(n)', space: 'O(n) stack', note: 'stack-overflow risk past ~10⁴ nodes' },
        { op: 'reverseBetween(m, n)', time: 'O(n)', space: 'O(1)', note: 'one walk + n−m+1 flips + 2 stitches' },
        { op: 'reverseKGroup', time: 'O(n)', space: 'O(1)', note: 'each node touched ≤ twice' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Reverse a linked list."** Write the iterative version without narration-worthy hesitation; then volunteer the invariant ("left of cur reversed, right untouched") — that one sentence is what separates memorisers from engineers. Follow-ups in order of frequency: recursive version (know the O(n)-stack caveat), reverse [m, n], reverse in k-groups, "reverse every OTHER k-group", "reverse a doubly list" (swap both pointers, then swap head/tail). If you finish early, they may ask: "can you detect whether reversing changed the list?" — that's the palindrome problem, page 8.`,
    },
    {
      t: 'check',
      ids: ['ll-q-rev-trace', 'll-q-rev-invariant', 'll-q-rev-rec-crash', 'll-q-rev-fill', 'll-q-rev-between-numeric', 'll-q-rev-kgroup-multi', 'll-q-rev-order', 'll-q-rev-doubly'],
    },
  ],
}

/* ═══════════════════════════════ 6. Fast and slow pointers ═══════════════════════════════ */

export const fastSlow: Page = {
  id: 'fast-slow-pointers',
  title: 'Fast and slow pointers — two speeds, one pass',
  summary: 'The middle-of-list trick and why 2× speed lands on the middle, the fixed-gap trick for nth-from-end, parity of even lists, and the general principle: encode a global property into the relative motion of two walkers.',
  minutes: 14,
  blocks: [
    {
      t: 'md',
      md: `
        A list has no length and no indices, so "the middle" and "n-th from the end" seem to demand two passes: one to count, one to walk. The two-pointer family encodes the *relationship* between the target position and the end into the **relative motion** of two pointers, collapsing both passes into one. Two shapes cover everything:

        ## Shape 1 — different speeds (the middle)

        Start both at head; slow moves 1 node per round, fast moves 2.

        **Claim.** When fast can no longer move (null or at the last node), slow is at the middle: index $\\lfloor n/2 \\rfloor$ with \`fast = head\` start, i.e. the **second** middle of an even-length list, the unique middle of an odd one.

        *Proof.* Let $s$ and $f$ be the indices of slow and fast. Invariant: $f = 2s$ after every round (both start at 0; each round adds 1 and 2). The loop stops when $f \\ge n-1$, i.e. when $2s \\ge n-1$, i.e. $s \\ge (n-1)/2$; and it stopped one round earlier with $2(s-1) < n-1$, i.e. $s < (n+1)/2$. So $(n-1)/2 \\le s < (n+1)/2$, and since $s$ is an integer, $s = \\lfloor n/2 \\rfloor$ (for even n it also rules out $s = n/2 - \\epsilon$… precisely: $s$ is the unique integer in that half-open interval). ∎

        **Parity control.** The two guard styles differ on even lists:
        - \`while (fast && fast->next)\` with both at head ⇒ slow ends at $n/2$ (second middle; fast ends at null).
        - \`while (fast->next && fast->next->next)\` with both at head ⇒ slow ends at $\\lfloor (n-1)/2 \\rfloor$ (the node BEFORE the second half; fast ends at the last node). This is the guard the split-for-merge-sort and palindrome algorithms use — they want the *predecessor* of the second half so they can cut there.

        Saying which middle your loop produces, unprompted, is worth real credibility: it is exactly the detail that breaks merge-sort-on-lists when chosen wrong (a 2-node list splits as 1+1 only with the right guard; with the wrong one slow never advances and the recursion never terminates).
      `,
    },
    {
      t: 'viz',
      algo: 'll-middle',
      caption: 'The index counter shows the invariant f = 2·s holding at every frame. Odd length: slow stops at the unique middle. Even: it stops at the second of the two middles. Try both.',
    },
    {
      t: 'md',
      md: `
        ## Shape 2 — fixed gap (nth from the end)

        To land on the node that is $n$ positions before the end without knowing the length: send \`first\` ahead by exactly $n$ nodes, start \`second\` at head, then move **both** one step per round until first falls off the end.

        **Invariant:** the gap (first's index − second's index) is exactly $n$ forever, because both advance together. When first = null, first's "index" is $L$ (one past the last node of a length-$L$ list), so second's index is $L - n$ — exactly the n-th node from the end (1-based from the tail). ∎

        Two conventions float around interviews:
        - **first walks to null** ⇒ second lands ON the n-th-from-end node. Loop: \`while (first)\`.
        - **first walks to the last node** (stop at \`first->next == null\`) ⇒ second lands on the node BEFORE it; return \`second->next\`. Same idea, shifted by one; LeetCode's "remove nth from end" uses this one because it needs the predecessor to unlink.

        The same fixed-gap machinery solves: *find the middle* (gap trick with speed 2 is shape 1), *detect a cycle* (page 7 — the gap shrinks by 1 per round instead of staying fixed), *find the k-th node from the end of two lists simultaneously*, and *split a list into two halves without counting*.
      `,
    },
    {
      t: 'viz',
      algo: 'll-nth-from-end',
      caption: 'The gap opens to exactly n, then both pointers slide in lockstep — the gap label never changes. When first falls off the end, second is the answer. Try n = 1 (last node) and n = length (head).',
    },
    {
      t: 'viz',
      algo: 'll-two-pass-vs-one',
      caption: 'The same job done the textbook two-pass way: count the length, re-walk length−n. The meter totals ≈ 2n − visits. Same big-O, but the one-pass version never needs the length — decisive when the "list" is a stream you can only read once.',
    },
    {
      t: 'code',
      title: 'Both shapes (all five languages for the middle; gap version in three)',
      code: {
        cpp: `ListNode* middle(ListNode* head) {           // second middle on even n
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}

ListNode* nthFromEnd(ListNode* head, int n) {  // lands ON it (first → null)
    ListNode* first = head;
    for (int i = 0; i < n; i++) first = first->next;   // n ≤ length assumed
    ListNode* second = head;
    while (first) { first = first->next; second = second->next; }
    return second;
}`,
        java: `ListNode middle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}

ListNode nthFromEnd(ListNode head, int n) {
    ListNode first = head;
    for (int i = 0; i < n; i++) first = first.next;
    ListNode second = head;
    while (first != null) { first = first.next; second = second.next; }
    return second;
}`,
        python: `def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow

def nth_from_end(head, n):
    first = head
    for _ in range(n):
        first = first.next
    second = head
    while first:
        first = first.next
        second = second.next
    return second`,
        js: `const middle = (head) => {
    let slow = head, fast = head;
    while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
    return slow;
};
const nthFromEnd = (head, n) => {
    let first = head;
    for (let i = 0; i < n; i++) first = first.next;
    let second = head;
    while (first) { first = first.next; second = second.next; }
    return second;
};`,
        c: `struct Node* middle(struct Node* head) {
    struct Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}
struct Node* nth_from_end(struct Node* head, int n) {
    struct Node* first = head;
    for (int i = 0; i < n; i++) first = first->next;
    struct Node* second = head;
    while (first) { first = first->next; second = second->next; }
    return second;
}`,
      },
      note: 'If n may exceed the length, first hits null DURING the opening walk — decide the contract (return null? clamp?) before the loop, or you dereference null. The gap version assumes 1 ≤ n ≤ length.',
    },
    {
      t: 'steps',
      title: 'Choosing the right two-pointer shape',
      items: [
        { title: 'Position relative to the END', md: '…nth from end, middle, last-k window → two pointers, same speed, fixed gap or speed ratio.' },
        { title: 'Position relative to a VALUE', md: '…first node ≥ x, node before a duplicate → one pointer with prev (page 3).' },
        { title: 'Correlation between TWO lists', md: '…intersection, merge → one pointer per list (page 9).' },
        { title: 'A hidden cycle', md: '…two speeds; meeting is the certificate (page 7).' },
      ],
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'The general principle',
      md: `Two pointers work whenever the answer's position is defined by a **relationship** (twice as far, exactly n behind, same total distance travelled) rather than an absolute index. Encode the relationship in the motion; the endpoint falls out for free. You will see this idea again in arrays (sliding window), strings (two-pointer palindrome), and trees (the "two iterators" LCA trick) — linked lists are where it is purest, because there are no indices to hide behind.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'middle (fast/slow)', time: 'O(n)', space: 'O(1)', note: '≈ n/2 rounds, one pass' },
        { op: 'nth-from-end (gap)', time: 'O(n)', space: 'O(1)', note: 'each node touched ≤ twice, single stream' },
        { op: 'nth-from-end (two-pass)', time: 'O(n)', space: 'O(1)', note: 'needs the length first' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Find the middle in ONE pass"** and **"delete the nth node from the end in ONE pass"** are the two classics. For the delete, the polished answer chains three techniques: dummy head (the target might be the head) + gap pointers with the stop-at-last-node convention (you need the PREDECESSOR) + one unlink. Write it as: dummy → first ahead n+1 steps (note: n+1, because we want the node before) → slide both to first == null → \`second->next = second->next->next\`. Knowing WHY the gap is n+1 for deletion but n for lookup is the whole test.`,
    },
    {
      t: 'check',
      ids: ['ll-q-fs-middle-trace', 'll-q-fs-even', 'll-q-fs-gap-numeric', 'll-q-fs-delete-fill', 'll-q-fs-guard-multi', 'll-q-fs-onepass', 'll-q-fs-split-2'],
    },
  ],
}

/* ═══════════════════════════════ 7. Cycle detection ═══════════════════════════════ */

export const cycleDetection: Page = {
  id: 'cycle-detection',
  title: "Cycle detection — Floyd's algorithm and the distance proof",
  summary: 'Why the tortoise and hare must meet inside a cycle, the exact modular arithmetic that finds the cycle entrance, Brent’s variant, and the visited-set alternative with its costs.',
  minutes: 16,
  blocks: [
    {
      t: 'md',
      md: `
        A corrupted or maliciously constructed list may loop back on itself: some node's next points at an earlier node. Traversal never terminates, \`size()\` never returns, and your program hangs. **Detecting the cycle in O(n) time and O(1) space** is Floyd's tortoise-and-hare algorithm — and finding *where* the cycle starts is a two-line corollary with a genuinely beautiful proof.

        ## Detection

        slow moves 1 per round, fast moves 2, both from head. Two outcomes:

        **No cycle:** fast reaches null (or the last node), loop exits, return false.

        **Cycle:** fast enters the cycle and, since it never leaves (every next stays inside), slow eventually enters too. Now consider their positions *inside the cycle*, as integers mod $C$ (the cycle length). Each round, fast's position advances 2 and slow's 1, so the **gap** $g = (f - s) \\bmod C$ decreases by exactly 1 each round: $g \\to g-1 \\to g-2 \\to \\dots$ It cannot skip over 0 — it must LAND on it. When $g = 0$, both pointers are on the same node: **they meet**. Since $g$ starts at most $C-1$, they meet within $C$ rounds of slow's entry. ∎

        The "gap shrinks by 1" argument is the whole algorithm — and it explains why the hare moves at exactly 2× speed. If the speeds differ by $d$, the gap shrinks by $d$ per round, and the pointers meet iff some multiple of $d$ lands on $g \\equiv 0 \\pmod C$ — guaranteed for every $C$ when $d = 1$. Speed 2 (i.e. $d = 1$) is the simplest provably-correct choice; a faster hare saves no asymptotics and only complicates the proof.

        **Bounds.** Meeting happens within $O(L + C)$ steps for slow (it traverses the stem once and at most a full cycle), so O(n) time; two pointers, O(1) space.
      `,
    },
    {
      t: 'viz',
      algo: 'll-floyd',
      caption: 'With a cycle: watch the gap argument in the notes — the hare closes by exactly one node per round and cannot hop over the tortoise. With pos = −1: the hare falls off the end instead. Try a cycle starting at index 0 (no stem).',
    },
    {
      t: 'md',
      md: `
        ## Finding the entrance — the L ≡ −m proof

        Name the quantities: **stem** $L$ = nodes before the cycle; **cycle length** $C$; the entrance is node $L$ (0-indexed). Suppose the pointers meet after slow has taken $t$ steps. Then:

        $$\\text{slow travelled } t = L + m, \\qquad \\text{fast travelled } 2t = L + m + jC$$

        for some $m \\in [0, C)$ — how far into the cycle the meeting point is — and some whole laps $j \\ge 1$. Substituting $2t$ for fast and $t = L + m$:

        $$2(L + m) = L + m + jC \\;\\Rightarrow\\; L + m = jC \\;\\Rightarrow\\; L = jC - m.$$

        Read the last equation as a walking instruction: **starting at the head and walking $L$ steps lands on the entrance. And starting at the MEETING POINT and walking $L$ steps also lands on the entrance**, because $L = jC - m$ means "$j$ full laps minus $m$ steps" — from the meeting point (which is $m$ past the entrance), going back $m$ and around $j$ laps lands exactly on the entrance.

        So: put one pointer at head, one at the meeting point, walk BOTH one step per round. After $L$ steps each, both sit on the entrance — that is where they meet. The corollary animation shows the two walkers converging; the notes track the modular arithmetic frame by frame.

        **Total cost:** at most $L + C$ (detection) + $L$ (entrance walk) steps: O(n), O(1) space, no bookkeeping structure.

        ## The alternatives, honestly compared

        | method | time | space | notes |
        |---|---|---|---|
        | visited hash set of nodes | O(n) | **O(n)** | simplest to write; stores pointers, needs a hash set (Java: identity, not equals!) |
        | Floyd | O(n) | **O(1)** | two pointers; also finds the entrance |
        | Brent | O(n) | O(1) | one pointer moves; faster constant (fewer pointer dereferences); teleports slow to fast every power-of-2 steps |
        | mark visited in a node flag | O(n) | O(1) | mutates the input — forbidden unless the interviewer allows it |

        Brent's algorithm deserves one paragraph because it shows up in "can you do better?" follow-ups: fast advances one step at a time and remembers how many steps since slow last moved; every time the count hits a power of two, slow teleports to fast's position and the count resets. It is still the gap argument (slow is "parked", fast sweeps), but it halves-to-two-thirds the number of pointer reads — measurable when nodes are cache-cold.
      `,
    },
    {
      t: 'viz',
      algo: 'll-cycle-start',
      caption: 'The entrance walk: p from head, q from the meeting point, one step each — they collide exactly at the entrance. The notes carry the equation L = jC − m so you can check the arithmetic at every frame.',
    },
    {
      t: 'code',
      title: 'Detect + locate, all five languages',
      code: {
        cpp: `ListNode* detectCycle(ListNode* head) {          // entrance, or nullptr
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {                      // meeting: cycle exists
            ListNode* p = head;                  // walk both by 1…
            while (p != slow) {
                p = p->next;
                slow = slow->next;
            }
            return p;                            // …they meet at the entrance
        }
    }
    return nullptr;                              // fast fell off the end
}`,
        java: `ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {
            ListNode p = head;
            while (p != slow) { p = p.next; slow = slow.next; }
            return p;
        }
    }
    return null;
}`,
        python: `def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:                 # 'is' — identity, not __eq__!
            p = head
            while p is not slow:
                p = p.next
                slow = slow.next
            return p
    return None`,
        js: `const detectCycle = (head) => {
    let slow = head, fast = head;
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) {
            let p = head;
            while (p !== slow) { p = p.next; slow = slow.next; }
            return p;
        }
    }
    return null;
};`,
        c: `struct Node* detect_cycle(struct Node* head) {
    struct Node *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            struct Node* p = head;
            while (p != slow) { p = p->next; slow = slow->next; }
            return p;
        }
    }
    return NULL;
}`,
      },
      note: 'Identity, not equality: the pointers must be compared by ADDRESS. In Python that is `is`; in Java never override equals on list nodes and then compare with ==… actually == on references IS identity in Java — the trap is calling .equals(). In C++ comparing ListNode* is address comparison — correct. Comparing *values* would report false cycles (two nodes both holding 7 "meet").',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Cycle-code traps',
      md: `- **Guard order:** \`while (fast && fast->next)\` — reversed (\`fast->next && fast\`) dereferences null when fast IS null. Short-circuit saves you only in the written order.
- **Checking the meeting BEFORE the first move:** if you test \`slow == fast\` at the top before any step, it is trivially true (both at head). Move first, then compare.
- **Advancing fast twice blindly:** \`fast = fast->next->next\` needs fast->next non-null — that is exactly what the guard's second clause buys.
- **Comparing values instead of pointers** — a list like 1→2→1 (no cycle) "meets" at value 1.
- **"Where's the cycle LENGTH?"** follow-up: after finding the entrance (or any meeting point), walk from it around until you return, counting — O(C).`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'hasCycle (Floyd)', time: 'O(n)', space: 'O(1)', note: 'meeting within L + C steps' },
        { op: 'cycle entrance (Floyd + walk)', time: 'O(n)', space: 'O(1)', note: 'adds ≤ L steps' },
        { op: 'cycle length', time: 'O(n)', space: 'O(1)', note: 'lap from any meeting point' },
        { op: 'visited-set detection', time: 'O(n)', space: 'O(n)', note: 'simpler; identity-hash required' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Does this list have a cycle?" → "Where does it begin?" → "How long is it?"** is a standard three-act interview. The proof is the differentiator: when asked *why* the second phase works, "L = jC − m, so walking L from head and from the meeting point both land on the entrance" is a complete answer in two sentences. Draw the lollipop (stem + circle) while you say it. Act three (length): meet anywhere, walk one pointer around until it returns, count. Bonus round: "without modifying nodes and without Floyd, using O(1) space, can you find the length?" — that's Brent, or reverse-the-list-and-see-where-it-ends trickery; mentioning Brent by name lands.`,
    },
    {
      t: 'check',
      ids: ['ll-q-cyc-gap', 'll-q-cyc-entrance-numeric', 'll-q-cyc-guard-fill', 'll-q-cyc-values', 'll-q-cyc-length', 'll-q-cyc-multi', 'll-q-cyc-brent'],
    },
  ],
}

/* ═══════════════════════════════ 8. Palindrome & restructuring halves ═══════════════════════════════ */

export const palindromeHalves: Page = {
  id: 'palindrome-halves',
  title: 'Palindrome check — middle, reverse, compare (and put it back)',
  summary: 'The O(1)-space palindrome pattern as a composition of three learned primitives, why the short half governs the loop, restoring the list afterwards, and the array-copy alternative ranked honestly.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        "Is this list a palindrome?" (1→2→3→2→1: yes) looks trivial until the constraint lands: **O(1) extra space**. Copying values to an array and two-pointering it is O(n) space — correct, and you should say so first, because naming the naive solution and its cost is how good interviews start. Then improve it.

        A list cannot be walked backwards, so the second half must be made walkable — by REVERSING it. The composition:

        1. **Find the split point** with fast/slow using the \`fast->next && fast->next->next\` guard: slow stops at the node *before* the second half, so \`slow->next\` is the second half's head and \`slow\` is where you would cut.
        2. **Reverse the second half** in place (page 5's template).
        3. **Compare in lockstep**: p from head, q from the reversed half, one step each, until **q** runs out.

        **Why q's exhaustion is the right stop rule.** For even $n$ both halves have $n/2$ nodes, so q and p exhaust together after $n/2$ mirror pairs. For odd $n = 2h+1$ the guard leaves slow at index $h$ — the middle itself — so the second half is indices $h+1 \\dots 2h$: $h$ nodes, NOT including the middle. q exhausts after $h$ mirror pairs; p has advanced to index $h$ but the middle is never compared — it mirrors itself, so skipping it costs nothing. **The clean invariant: pair $i$ of the comparison is (node $i$, node $n-1-i$) for every $i < \\lfloor n/2 \\rfloor$; when q exhausts, every mirror pair has been covered.**

        **Restoring.** If the caller expects the list intact (judges often re-traverse it; real code always), reverse the second half back after comparing and relink. Two reversals, still O(n)/O(1). Announcing "I'll restore it before returning" is a seniority signal — mutating the input of a query function is a design bug.
      `,
    },
    {
      t: 'viz',
      algo: 'll-palindrome',
      caption: 'All three phases in one animation: the guard lands slow before the second half, the flips reverse it (each flip a frame), then mirror pairs compare in lockstep. Try a non-palindrome and watch the mismatch frame light up both pointers.',
    },
    {
      t: 'code',
      title: 'O(1)-space palindrome with restore',
      code: {
        cpp: `bool isPalindrome(ListNode* head) {
    if (!head || !head->next) return true;
    // 1. split point: slow ends BEFORE the second half
    ListNode *slow = head, *fast = head;
    while (fast->next && fast->next->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    // 2. reverse second half
    ListNode* second = reverse(slow->next);
    // 3. compare mirror pairs; q is the shorter-or-equal half
    ListNode *p = head, *q = second;
    bool ok = true;
    while (q) {
        if (p->val != q->val) { ok = false; break; }
        p = p->next;
        q = q->next;
    }
    slow->next = reverse(second);      // 4. restore before returning
    return ok;
}

ListNode* reverse(ListNode* head) {     // page 5's template
    ListNode *prev = nullptr, *cur = head;
    while (cur) {
        ListNode* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    return prev;
}`,
        java: `boolean isPalindrome(ListNode head) {
    if (head == null || head.next == null) return true;
    ListNode slow = head, fast = head;
    while (fast.next != null && fast.next.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode second = reverse(slow.next);
    ListNode p = head, q = second;
    boolean ok = true;
    while (q != null) {
        if (p.val != q.val) { ok = false; break; }
        p = p.next; q = q.next;
    }
    slow.next = reverse(second);       // restore
    return ok;
}`,
        python: `def is_palindrome(head):
    if not head or not head.next:
        return True
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    second = reverse(slow.next)
    p, q = head, second
    ok = True
    while q:
        if p.val != q.val:
            ok = False
            break
        p = p.next
        q = q.next
    slow.next = reverse(second)        # restore
    return ok`,
        js: `const isPalindrome = (head) => {
    if (!head || !head.next) return true;
    let slow = head, fast = head;
    while (fast.next && fast.next.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    const second = reverse(slow.next);
    let p = head, q = second, ok = true;
    while (q) {
        if (p.val !== q.val) { ok = false; break; }
        p = p.next;
        q = q.next;
    }
    slow.next = reverse(second);       // restore
    return ok;
};`,
        c: `bool is_palindrome(struct Node* head) {
    if (!head || !head->next) return true;
    struct Node *slow = head, *fast = head;
    while (fast->next && fast->next->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    struct Node* second = reverse(slow->next);
    struct Node *p = head, *q = second;
    bool ok = true;
    while (q) {
        if (p->val != q->val) { ok = false; break; }
        p = p->next;
        q = q->next;
    }
    slow->next = reverse(second);      /* restore */
    return ok;
}`,
      },
      note: 'One-node and empty lists are palindromes — the guard at the top also protects the fast->next->next dereference. If the interviewer says mutation is fine, drop step 4 and say why you dropped it.',
    },
    {
      t: 'md',
      md: `
        ## The three solutions, ranked

        | approach | time | space | verdict |
        |---|---|---|---|
        | copy to array + two pointers | O(n) | O(n) | correct, trivial, 3 lines — say it first |
        | recursive (compare head vs unwinding tail) | O(n) | O(n) stack | elegant, crashes past ~10⁴ nodes |
        | middle + reverse + compare (+ restore) | O(n) | **O(1)** | the expected answer |

        The recursive version is worth knowing because the interviewer may ask for it: pass a mutable "front pointer" down the recursion; at each unwinding frame compare the frame's node with the front pointer's node and advance front. It reads beautifully and costs a stack — the same trade as recursive reversal.

        **The composition habit.** Notice this page taught nothing new: it *composed* the middle-finder (page 6), the reversal (page 5), and a lockstep walk. That composition — split, transform a half, walk both — is also exactly reorder-list (page 11) and merge-sort-on-lists (page 9). Interviewers pick palindrome because it tests whether the primitives are *owned* rather than memorised: if you can write reverse and middle cold, the "hard" version is assembly work.
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Half-splitting off-by-ones',
      md: `The failure mode: using the \`fast && fast->next\` guard (slow ends AT the second middle) and then comparing slow's half against the rest — on even n the halves overlap or one is short by a node, and palindromes like 1→1 or 1→2→2→1 return false. **Test your guard on n = 1, 2, 3 by hand before trusting it.** Second trap: forgetting the restore and failing a judge that traverses the list again after the query. Third: comparing while \`p\` (not \`q\`) runs out — on odd n p walks into the reversed half and compares garbage.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'palindrome (reverse-half)', time: 'O(n)', space: 'O(1)', note: '3 phases, each ≤ n/2 steps' },
        { op: 'palindrome (array copy)', time: 'O(n)', space: 'O(n)', note: 'the fallback to name first' },
        { op: 'restore', time: 'O(n)', space: 'O(1)', note: 'a second reversal of the half' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Is a linked list a palindrome?"** Expected arc: state the O(n)-space array solution (30 seconds), then say "if space matters, I reverse the second half" and build it. Follow-ups: "restore the list" (reverse back), "what if nodes are immutable?" (array copy is then the ONLY option — knowing when O(1) space is impossible matters), "recursive version?" (front-pointer-down-the-recursion), and the twist "palindrome with at most one node deletable" (two-pointer on the array copy, skipping once on mismatch from either side — an array problem wearing a list costume).`,
    },
    {
      t: 'check',
      ids: ['ll-q-pal-guard', 'll-q-pal-trace', 'll-q-pal-restore', 'll-q-pal-fill', 'll-q-pal-odd-numeric', 'll-q-pal-multi', 'll-q-pal-recursive'],
    },
  ],
}
