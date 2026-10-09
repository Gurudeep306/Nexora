import type { Page } from '../../../types'

/* ═══════════════════════════════ 9. Merging & merge sort ═══════════════════════════════ */

export const mergingSort: Page = {
  id: 'merging-sort',
  title: 'Merging two sorted lists — and the sort that lists do best',
  summary: 'The tail-pointer merge pattern with its stability argument, merge sort on a list with the recurrence derived, why lists make merge sort natural and arrays make quicksort natural, and insertion sort as the small-n workhorse.',
  minutes: 17,
  blocks: [
    {
      t: 'md',
      md: `
        Merging two sorted lists into one sorted list is the engine of external sorting, k-way merges, the Arrays/Sorting topics ahead — and the cleanest example of the **tail-pointer pattern**: a dummy owns the growing result, and a \`tail\` pointer marks its last node so appending is O(1).

        ## The merge and its two proofs

        \`\`\`
        dummy ← Node(0); tail ← dummy
        while a ≠ null and b ≠ null:
            if a.value ≤ b.value:  tail.next ← a; a ← a.next; tail ← tail.next
            else:                  tail.next ← b; b ← b.next; tail ← tail.next
        tail.next ← (whichever of a, b is non-null)
        return dummy.next
        \`\`\`

        **Correctness.** Invariant: *the result (dummy.next … tail) is sorted and consists of the smallest $(n_a - |a|) + (n_b - |b|)$ elements of the two inputs.* Each round appends the smaller of the two heads — no remaining element can be smaller, since each list's head is its minimum — so the invariant extends by one element. When one list empties, its remainder is entirely ≥ the last appended element (sortedness) and the other list's remainder is already sorted, so attaching it in one write preserves the invariant through the end. ∎

        **Stability.** When heads TIE, the algorithm takes from \`a\`. Elements of equal value therefore appear in the result in input order — a from before b. That is **stability**, and it is a choice, not an accident: flipping the comparison to \`<\` would take from b on ties. Stability matters whenever elements carry satellite data (sort people by age, keep same-age people in registration order) and whenever merges compose — merge sort is stable exactly because its merge is.

        **Cost.** At most one comparison per output node: $O(n_a + n_b)$ time. **Zero allocations** — the original nodes are relinked; this is where list merging beats array merging, which must write into a third array of size $n_a + n_b$. Space: O(1) beyond the output it builds in place.
      `,
    },
    {
      t: 'viz',
      algo: 'll-merge-sorted',
      caption: 'Two lists, a growing result, one comparison per node. The notes flag the tie rule (≤ sends ties to A — that arrow is stability) and the one-write remainder attach at the end.',
    },
    {
      t: 'code',
      title: 'The merge (five languages)',
      code: {
        cpp: `ListNode* merge(ListNode* a, ListNode* b) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (a && b) {
        if (a->val <= b->val) { tail->next = a; a = a->next; }   // ≤ ⇒ stable
        else                  { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;      // remainder is sorted and ≥ tail
    return dummy.next;
}`,
        java: `ListNode merge(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else                { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;
    return dummy.next;
}`,
        python: `def merge(a, b):
    dummy = Node(0)
    tail = dummy
    while a and b:
        if a.val <= b.val:
            tail.next = a; a = a.next
        else:
            tail.next = b; b = b.next
        tail = tail.next
    tail.next = a if a else b
    return dummy.next`,
        js: `const merge = (a, b) => {
    const dummy = new ListNode(0);
    let tail = dummy;
    while (a && b) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else                { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = a ?? b;
    return dummy.next;
};`,
        c: `struct Node* merge(struct Node* a, struct Node* b) {
    struct Node dummy = {0, NULL};
    struct Node* tail = &dummy;
    while (a && b) {
        if (a->val <= b->val) { tail->next = a; a = a->next; }
        else                  { tail->next = b; b = b->next; }
        tail = tail->next;
    }
    tail->next = a ? a : b;
    return dummy.next;
}`,
      },
      note: 'All five versions share the same tie rule (a ≤ b takes from a) — that single character is the stability guarantee.',
    },
    {
      t: 'md',
      md: `
        ## Merge sort on a linked list

        Merge sort: split in half, sort both halves, merge. On an **array** the split is free (indices) but the merge costs an auxiliary array. On a **list** the split costs an O(n) fast/slow walk but the merge needs no extra memory at all. The trade cancels — and then the list version wins on the thing arrays cannot fix:

        $$T(n) = 2\\,T(n/2) + \\Theta(n) \\;\\Rightarrow\\; T(n) = \\Theta(n \\log n)$$

        (Master theorem case 2, or the level-sum argument: $\\log n$ levels, each level's merges touch every node once, $\\Theta(n)$ per level.) Space: O(1) auxiliary + O(log n) recursion stack — versus array merge sort's Θ(n) auxiliary. This is why the Linux kernel sorts its linked lists with merge sort, and why "sort a linked list in O(n log n) time and O(1) space" is a completely reasonable interview demand.

        The two implementation details that decide correctness:

        1. **The split guard.** Use \`fast = head->next\` with \`while (fast && fast->next)\` (or the next-next guard): slow must end at the END OF THE FIRST HALF. With a wrong guard, a 2-node list splits as 2+0, the recursive call gets the same list, and the recursion never terminates — infinite loop, stack overflow. Verify the split on n = 2 by hand, always.
        2. **Cut after splitting.** \`slow->next = null\` makes two genuinely separate lists; without it the left half's tail still points into the right half and the merge produces a corrupted chain.
      `,
    },
    {
      t: 'viz',
      algo: 'll-merge-sort',
      caption: 'The recursion stack beside the working list: each level splits at the middle (fast/slow), cuts, recurses left then right, then merges with head comparisons. The indentation in the notes is the recursion depth. Watch single nodes return as "already sorted" — the base case.',
    },
    {
      t: 'code',
      title: 'Merge sort on a list (the split guard is the whole game)',
      code: {
        cpp: `ListNode* mergeSort(ListNode* head) {
    if (!head || !head->next) return head;         // 0 or 1 nodes: sorted
    ListNode *slow = head, *fast = head->next;     // fast ONE AHEAD…
    while (fast && fast->next) {                   // …so slow ends the 1st half
        slow = slow->next;
        fast = fast->next->next;
    }
    ListNode* second = slow->next;
    slow->next = nullptr;                          // CUT: two real lists
    ListNode* left = mergeSort(head);
    ListNode* right = mergeSort(second);
    return merge(left, right);                     // the stable merge above
}`,
        java: `ListNode mergeSort(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode slow = head, fast = head.next;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode second = slow.next;
    slow.next = null;
    return merge(mergeSort(head), mergeSort(second));
}`,
        python: `def merge_sort(head):
    if not head or not head.next:
        return head
    slow, fast = head, head.next
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    second = slow.next
    slow.next = None
    return merge(merge_sort(head), merge_sort(second))`,
        js: `const mergeSort = (head) => {
    if (!head || !head.next) return head;
    let slow = head, fast = head.next;
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    const second = slow.next;
    slow.next = null;
    return merge(mergeSort(head), mergeSort(second));
};`,
        c: `struct Node* merge_sort(struct Node* head) {
    if (!head || !head->next) return head;
    struct Node *slow = head, *fast = head->next;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    struct Node* second = slow->next;
    slow->next = NULL;
    return merge(merge_sort(head), merge_sort(second));
}`,
      },
      note: 'Why fast starts one ahead: with both at head, a 2-node list gives fast = node 2 with fast->next null — the loop body never runs — slow stays at node 1, and the split is 1+1. Correct. With fast at head and the loop running once more, slow would pass the middle. Trace n = 2 before trusting any guard.',
    },
    {
      t: 'md',
      md: `
        ## Insertion sort — and the one place lists beat arrays at sorting

        Insertion sort: keep a sorted prefix; take each new element and insert it at its place. $O(n^2)$ comparisons on average ($\\approx n^2/4$), O(n) best case on sorted input, O(1) space, **stable**, and excellent for small $n$ — which is why every production hybrid sort (Timsort, introsort, Java's Arrays.sort for tiny ranges) switches to insertion sort below ~32–64 elements.

        On an **array**, insertion also shifts elements: another $\\approx n^2/4$ data moves, and moving a large record is expensive. On a **list**, finding the spot still costs the scan, but the insert itself is **two pointer writes** regardless of element size. For big payloads with a comparator, list insertion sort does half the work array insertion sort does. This is the honest, narrow case where a list out-sorts an array — not "lists sort faster" (they don't; cache misses dominate), but "lists INSERT cheaper once you're already paying for the scan".

        ## Which sort belongs where (the full picture, one topic early)

        | sort | array | singly list | stable |
        |---|---|---|---|
        | merge sort | Θ(n log n), Θ(n) aux | **Θ(n log n), O(1) aux** | yes |
        | quicksort | **Θ(n log n) avg, in-place** | awkward: no random access for partition, no O(1) swap | no |
        | heapsort | Θ(n log n), in-place | impossible: needs index jumps | no |
        | insertion sort | O(n²), shifts data | O(n²), **2-write inserts** | yes |

        Read the table as one sentence: **arrays can jump, so partition-based sorts win there; lists can only walk, so walk-based sorts win here.** The Sorting topics prove all of this properly; this page gives you the list half now because "sort a linked list" is asked as a LIST question.
      `,
    },
    {
      t: 'viz',
      algo: 'll-insertion-sort',
      caption: 'Detach each input head, scan the sorted result for its slot, splice with two writes. The comparison counter ends near n²/4 — and every insert is exactly 2 pointer writes no matter how far right the slot is.',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Sort-on-list bugs',
      md: `- **Merge-sort split guard wrong** ⇒ 2-node lists split 2+0 ⇒ infinite recursion. Trace n = 2 first.
- **Forgetting the cut** (\`slow->next = null\`) ⇒ halves overlap ⇒ merge loops forever or loses nodes.
- **Merge tie rule flipped** ⇒ sort works but stability silently dies — only matters with satellite data, which is exactly when the interviewer checks.
- **Returning the wrong head after merge**: the result's head is \`dummy.next\`, computed inside the merge; a hand-rolled merge that forgets the dummy must special-case "first node appended".
- **Recursion depth**: merge sort's stack is only O(log n) — safe for millions of nodes. (Recursive REVERSAL was O(n) — unsafe. Know which is which.)`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'merge two sorted lists', time: 'O(na + nb)', space: 'O(1)', note: '≤ 1 comparison per output node, 0 allocations' },
        { op: 'merge sort (list)', time: 'O(n log n)', space: 'O(log n) stack', note: 'recurrence 2T(n/2)+Θ(n)' },
        { op: 'insertion sort (list)', time: 'O(n²) / O(n) sorted', space: 'O(1)', note: 'stable; the small-n workhorse' },
        { op: 'split at middle', time: 'O(n)', space: 'O(1)', note: 'fast/slow + one cut' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Sort a linked list in O(n log n)."** They want merge sort; quicksort on lists is a known trap answer (works, but the lack of random access makes the partition weak and the constant bad). Follow-ups: "is your sort stable?" (yes, because the merge takes ties from the left — SAY IT), "space?" (O(log n) stack; bottom-up merge sort removes even that by merging runs of size 1, 2, 4, … — a great bonus answer), "merge K sorted lists?" (heap of heads, O(N log k) — the Heaps topic), "why does Java sort objects with merge sort and primitives with quicksort?" (stability guarantees for objects; primitives have no identity, so stability is meaningless and quicksort's constant wins).`,
    },
    {
      t: 'check',
      ids: ['ll-q-merge-trace', 'll-q-merge-stable', 'll-q-mergesort-recurrence', 'll-q-mergesort-guard', 'll-q-sort-fill', 'll-q-sort-match', 'll-q-insertion-numeric', 'll-q-merge-kway'],
    },
  ],
}

/* ═══════════════════════════════ 10. Two lists side by side ═══════════════════════════════ */

export const twoLists: Page = {
  id: 'two-lists',
  title: 'Two lists side by side — intersection and equal-distance walks',
  summary: 'The intersection node problem with the switch-partners proof, why comparing values fails, the length-difference alignment method, and deduplication patterns (sorted adjacent vs unsorted hash-set).',
  minutes: 14,
  blocks: [
    {
      t: 'md',
      md: `
        Two lists **intersect** when, from some node on, they share the same nodes — the chains Y into one tail. Not "have equal values at some point": the same memory. The standard question: *find the intersection node, or report none, in O(n) time and O(1) space.*

        ## Why the naive ideas fail

        - **Compare values while walking in lockstep:** lists have different stem lengths, so equal nodes are at different depths — lockstep never lines them up. (And equal values aren't equal nodes anyway.)
        - **Nested loops:** O(n·m).
        - **Hash set of nodes from list A, then walk B:** correct, O(n + m) time — but O(n) space. Fine as the first answer; the follow-up demands O(1).

        ## The switch-partners trick

        Pointer p walks list A; when it falls off the end it restarts at B's head. Pointer q walks B symmetrically. **Claim: they meet at the intersection node, or both become null together.**

        *Proof.* Let A have $a$ own nodes, B have $b$ own nodes, and the shared tail $c$ nodes (so A's length is $a + c$, B's is $b + c$). p's route: A then B — after $a + c + b$ steps it is $b$ steps into B. q's route: B then A — after $b + c + a$ steps it is $a$ steps into A. **Both routes have the same total length $a + b + c$**, and step $a + b + c - c = a + b$ of each route is the FIRST SHARED NODE: p arrives there exactly when q does, because p covers $a + c$ (all of A) then $b - …$ precisely: p reaches the shared tail's first node after $a$ steps of A-walk plus $b$ steps of B's own part = step $a + b$; q reaches it after $b + a$. Same step number ⇒ same node ⇒ the loop \`while (p != q)\` exits there. If $c = 0$, both pointers reach null at step $a + b$ simultaneously — the same loop exits with p = q = null, which IS the "no intersection" answer. One loop, no case analysis. ∎

        The elegance worth naming: the pointers swap lists precisely to **cancel the length difference** — each walks the other's stem, equalising total distance. It is the fixed-gap idea (page 6) in disguise: the gap $|a - b|$ is absorbed by the switch.

        ## The alignment method (the other O(1) answer)

        Count both lengths ($n_a$, $n_b$), start the longer list's pointer $|n_a - n_b|$ nodes ahead, then walk in lockstep comparing **addresses**. Also O(n)/O(1), two passes; slightly more code, slightly easier to explain. Know both; the switch version is the one that impresses.
      `,
    },
    {
      t: 'viz',
      algo: 'll-intersection',
      caption: 'p walks A then B, q walks B then A — the notes track both positions per step and the switch moment. Empty the shared tail field and watch them both land on null together: the same loop answers "no intersection" with zero special cases.',
    },
    {
      t: 'code',
      title: 'Intersection by switching (five languages)',
      code: {
        cpp: `ListNode* getIntersection(ListNode* a, ListNode* b) {
    ListNode *p = a, *q = b;
    while (p != q) {                          // pointers, not values
        p = p ? p->next : b;                  // A exhausted → switch to B
        q = q ? q->next : a;                  // B exhausted → switch to A
    }
    return p;                                 // shared node, or nullptr if none
}`,
        java: `ListNode getIntersection(ListNode a, ListNode b) {
    ListNode p = a, q = b;
    while (p != q) {
        p = (p == null) ? b : p.next;
        q = (q == null) ? a : q.next;
    }
    return p;
}`,
        python: `def get_intersection(a, b):
    p, q = a, b
    while p is not q:
        p = b if p is None else p.next
        q = a if q is None else q.next
    return p`,
        js: `const getIntersection = (a, b) => {
    let p = a, q = b;
    while (p !== q) {
        p = p ? p.next : b;
        q = q ? q.next : a;
    }
    return p;
};`,
        c: `struct Node* get_intersection(struct Node* a, struct Node* b) {
    struct Node *p = a, *q = b;
    while (p != q) {
        p = p ? p->next : b;
        q = q ? q->next : a;
    }
    return p;
}`,
      },
      note: 'Termination check: each pointer traverses at most a + b + c + 1 nodes before the loop must exit (meeting or double-null), so no infinite loop even with no intersection. The null-switch happens at most once per pointer.',
    },
    {
      t: 'md',
      md: `
        ## Deduplication — sorted vs unsorted

        **Sorted list:** duplicates are adjacent, so one pass with a lookahead suffices — compare \`cur->val\` with \`cur->val == cur->next->val\`, unlink the next node when equal, and DON'T advance cur (three equal in a row must all go). O(n) time, O(1) space, no set.

        **Unsorted list:** duplicates can be anywhere, so adjacency tells you nothing. Two O(n)-time options:
        - **Hash set of seen values** + dummy-head walk: at each node, if its value is seen, unlink; else insert into the set and advance. O(n) space for the set. This is the standard answer and a preview of the Hashing topic.
        - **Nested comparison**: for each node, walk the rest and unlink matches — O(n²) time, O(1) space. Only acceptable when the interviewer explicitly forbids extra space AND n is small.

        The decision rule generalises far past lists: **sorted input converts "have I seen this?" from a memory problem into an adjacency problem.** Binary search, two-sum-on-sorted, interval merging, k-way dedup — all ride the same fact.

        **Delete-all-vs-keep-one variants:** "remove duplicates so each value appears once" (above); "remove every node whose value appears more than once" (sorted: detect a run of equal values and unlink the whole run — the prev/dummy pattern from page 3 handles the head case). Both are standard; both are one-pass with the right pointers.
      `,
    },
    {
      t: 'viz',
      algo: 'll-union-dedupe',
      caption: 'Unsorted dedup with a seen-set: one lookup per node, O(n) total — versus the n² bar the meter also draws (what nested comparison would have cost). Watch prev stay put after each unlink.',
    },
    {
      t: 'code',
      title: 'Dedup: sorted (adjacent) and unsorted (hash set)',
      code: {
        cpp: `// sorted list: O(n) time, O(1) space
ListNode* dedupSorted(ListNode* head) {
    ListNode* cur = head;
    while (cur && cur->next) {
        if (cur->val == cur->next->val)
            cur->next = cur->next->next;      // cur stays: 2-2-2 all go
        else
            cur = cur->next;
    }
    return head;                              // head itself is always kept
}

// unsorted list: O(n) time, O(n) space
ListNode* dedupUnsorted(ListNode* head) {
    unordered_set<int> seen;
    ListNode dummy(0); dummy.next = head;
    ListNode* prev = &dummy;
    while (prev->next) {
        if (seen.count(prev->next->val))
            prev->next = prev->next->next;    // prev stays
        else {
            seen.insert(prev->next->val);
            prev = prev->next;
        }
    }
    return dummy.next;
}`,
        java: `ListNode dedupSorted(ListNode head) {
    ListNode cur = head;
    while (cur != null && cur.next != null) {
        if (cur.val == cur.next.val) cur.next = cur.next.next;
        else cur = cur.next;
    }
    return head;
}
ListNode dedupUnsorted(ListNode head) {
    HashSet<Integer> seen = new HashSet<>();
    ListNode dummy = new ListNode(0); dummy.next = head;
    ListNode prev = dummy;
    while (prev.next != null) {
        if (seen.contains(prev.next.val)) prev.next = prev.next.next;
        else { seen.add(prev.next.val); prev = prev.next; }
    }
    return dummy.next;
}`,
        python: `def dedup_sorted(head):
    cur = head
    while cur and cur.next:
        if cur.val == cur.next.val:
            cur.next = cur.next.next
        else:
            cur = cur.next
    return head

def dedup_unsorted(head):
    seen = set()
    dummy = Node(0); dummy.next = head
    prev = dummy
    while prev.next:
        if prev.next.val in seen:
            prev.next = prev.next.next
        else:
            seen.add(prev.next.val)
            prev = prev.next
    return dummy.next`,
        js: `const dedupSorted = (head) => {
    let cur = head;
    while (cur && cur.next) {
        if (cur.val === cur.next.val) cur.next = cur.next.next;
        else cur = cur.next;
    }
    return head;
};
const dedupUnsorted = (head) => {
    const seen = new Set();
    const dummy = new ListNode(0); dummy.next = head;
    let prev = dummy;
    while (prev.next) {
        if (seen.has(prev.next.val)) prev.next = prev.next.next;
        else { seen.add(prev.next.val); prev = prev.next; }
    }
    return dummy.next;
};`,
        c: `/* sorted: adjacency only, no extra memory */
struct Node* dedup_sorted(struct Node* head) {
    struct Node* cur = head;
    while (cur && cur->next) {
        if (cur->val == cur->next->val) {
            struct Node* victim = cur->next;
            cur->next = victim->next;
            free(victim);
        } else {
            cur = cur->next;
        }
    }
    return head;
}
/* unsorted in C: no std hash set — either a small open-addressed table
   you write yourself (Hashing topic) or the O(n²) nested walk. Say which
   trade you're making and why. */`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Two-list traps',
      md: `- **Intersection by value:** two separate nodes both holding 7 are NOT an intersection. Compare pointers/identity, or the answer is wrong on adversarial inputs (which judges love).
- **The switch loop with only one null-check:** \`p = p->next ? … : b\` mis-handles p being the LAST node; the correct form switches when p IS null (\`p = p ? p->next : b\`), so p becomes null for exactly one iteration. Off-by-one here means the pointers never align.
- **Dedup advancing cur after an unlink** ⇒ the second of two equal neighbours is never examined ⇒ 1-1-1 becomes 1-1.
- **Dedup sorted deleting the head:** the head has no predecessor — but it also always SURVIVES dedup-keep-one, so no dummy is needed for that variant. Needed for "delete all nodes with duplicate values", where the head itself may go.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'intersection (switch)', time: 'O(n + m)', space: 'O(1)', note: 'each pointer walks ≤ n+m+1 nodes' },
        { op: 'intersection (align by length)', time: 'O(n + m)', space: 'O(1)', note: 'two counting passes + lockstep' },
        { op: 'intersection (hash set)', time: 'O(n + m)', space: 'O(n)', note: 'the fallback' },
        { op: 'dedup sorted', time: 'O(n)', space: 'O(1)', note: 'adjacency replaces memory' },
        { op: 'dedup unsorted', time: 'O(n)', space: 'O(n)', note: 'seen-set; O(n²)/O(1) if space is banned' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Find the node where two lists intersect."** The interviewer is testing identity-vs-value discipline and the O(1)-space trick. Open with the hash set (correct, simple), then volunteer the switch: "each pointer walks both stems, so total distance is equalised — they meet at the shared node or both null." Follow-ups: "prove they meet" (the a+b+c route-length argument above), "what if one list has a cycle?" (detect first — a cycle plus intersection needs case analysis; usually out of scope, saying so is fine), "return the intersection LENGTH" (walk the shared tail). For dedup: "sorted, O(1) space" and "unsorted, preserve order" are the two standard asks; "unsorted, don't preserve order" allows partitioning duplicates to the end — faster in cache terms, a nice observation.`,
    },
    {
      t: 'check',
      ids: ['ll-q-int-switch-trace', 'll-q-int-why-meet', 'll-q-int-noint', 'll-q-dedup-trace', 'll-q-dedup-fill', 'll-q-two-multi', 'll-q-int-length'],
    },
  ],
}

/* ═══════════════════════════════ 11. Regrouping & splicing ═══════════════════════════════ */

export const regrouping: Page = {
  id: 'regrouping',
  title: 'Regrouping and splicing — pairs, parity, partition, rotation, reorder',
  summary: 'Swap-pairs as the minimal relink exercise, odd-even threading, stable partition with two dummy chains, rotate-by-ring, and the reorder composition — five problems, one skill: growing auxiliary chains without allocating.',
  minutes: 16,
  blocks: [
    {
      t: 'md',
      md: `
        The problems on this page look unrelated — swapping pairs, regrouping by position parity, partitioning around a value, rotating, interleaving halves — but they are ONE technique: **grow one or more chains by threading existing nodes onto tail pointers, then concatenate with a couple of writes.** No node is ever allocated or copied; the art is keeping every intermediate state consistent and remembering which tails to stitch at the end.

        ## Swap pairs — the minimal version

        Per pair (a, b) after an anchor prev: three writes — \`a.next ← b.next\`, \`b.next ← a\`, \`prev.next ← b\` — then \`prev ← a\`. The dummy head absorbs "the first pair moves the head". An odd tail node is simply never touched (the loop condition \`prev.next && prev.next.next\` refuses to start a pair without two nodes).

        **Nodes, not values.** Swapping \`a.val\` and \`b.val\` passes the same tests — and is wrong the moment nodes carry satellite data, or another structure (an index, an iterator, a map value) holds pointers INTO this list. Interviewers who say "swap the nodes" mean pointers; if they didn't specify, ask, and default to relinking. It is also the version that generalises to k-groups (page 5).

        ## Odd-even — two chains threaded in one walk

        Nodes at odd POSITIONS (1st, 3rd, 5th…) must precede nodes at even positions. Two pointers, odd and even, start at nodes 1 and 2; each round: \`odd.next ← even.next; odd ← odd.next; even.next ← odd.next; even ← even.next\`. Both chains grow in place, inside the original nodes, and one final write — \`odd.next ← evenHead\` — concatenates. The loop guard \`even && even.next\` is the parity-sensitive part: even is the pointer that can run out mid-stride.

        *Positions, not values*: "odd-even" here means 1st/3rd/5th node, NOT nodes holding odd numbers. Mixing these up is a famous misread; restate the definition out loud before coding.

        ## Partition around x — stability for free

        Values < x before values ≥ x, **relative order preserved within each group**. Grow two dummy-headed chains (less, geq) as you walk the input; seal the geq chain's tail (\`geqTail.next = null\` — skip it and the last geq node still points into the old sequence: a cycle or duplicated tail), then one concatenation write \`lessTail.next ← geqHead\`. The seal-then-concatenate discipline is the whole algorithm; arrival order in each chain IS the original order, which is why list partition is **stable** while quicksort's array partition is not.
      `,
    },
    {
      t: 'viz',
      algo: 'll-swap-pairs',
      caption: 'Three writes per pair, each shown separately, with the anchor hopping to the pair’s new tail. An odd last node stays put — watch the loop condition refuse to touch it.',
    },
    {
      t: 'viz',
      algo: 'll-odd-even',
      caption: 'Two chains growing inside one list: odd jumps over each even node, even jumps over each odd, and the single join write concatenates. Zero allocations — the notes count rounds, not copies.',
    },
    {
      t: 'viz',
      algo: 'll-partition',
      caption: 'Every node routed to the less or geq chain on arrival — order within each chain is therefore original order (stability). Watch the seal write at the end: without it the last geq node points back into the input.',
    },
    {
      t: 'code',
      title: 'Pairs, odd-even, partition (C++ and Python shown; animation tabs carry all languages)',
      code: {
        cpp: `ListNode* swapPairs(ListNode* head) {
    ListNode dummy(0); dummy.next = head;
    ListNode* prev = &dummy;
    while (prev->next && prev->next->next) {
        ListNode *a = prev->next, *b = a->next;
        a->next = b->next;              // (1) a skips b
        b->next = a;                    // (2) pair flipped internally
        prev->next = b;                 // (3) spliced in
        prev = a;                       // a is the pair's new tail
    }
    return dummy.next;
}

ListNode* oddEven(ListNode* head) {
    if (!head) return nullptr;
    ListNode *odd = head, *even = head->next;
    ListNode* evenHead = even;          // bookmark the join point
    while (even && even->next) {
        odd->next = even->next;  odd = odd->next;     // odd jumps over even
        even->next = odd->next;  even = even->next;   // even jumps over odd
    }
    odd->next = evenHead;               // one write joins the chains
    return head;
}

ListNode* partition(ListNode* head, int x) {
    ListNode lessD(0), geqD(0);
    ListNode *less = &lessD, *geq = &geqD;
    while (head) {
        if (head->val < x) { less->next = head; less = head; }
        else               { geq->next = head; geq = head; }
        head = head->next;
    }
    geq->next = nullptr;                // SEAL — else the old next survives
    less->next = geqD.next;             // concatenate
    return lessD.next;
}`,
        python: `def swap_pairs(head):
    dummy = Node(0); dummy.next = head
    prev = dummy
    while prev.next and prev.next.next:
        a, b = prev.next, prev.next.next
        a.next = b.next
        b.next = a
        prev.next = b
        prev = a
    return dummy.next

def odd_even(head):
    if not head: return None
    odd, even = head, head.next
    even_head = even
    while even and even.next:
        odd.next = even.next;  odd = odd.next
        even.next = odd.next;  even = even.next
    odd.next = even_head
    return head

def partition(head, x):
    less_d, geq_d = Node(0), Node(0)
    less, geq = less_d, geq_d
    while head:
        if head.val < x:
            less.next = head; less = head
        else:
            geq.next = head; geq = head
        head = head.next
    geq.next = None                    # seal
    less.next = geq_d.next             # concatenate
    return less_d.next`,
        java: `ListNode swapPairs(ListNode head) {
    ListNode dummy = new ListNode(0); dummy.next = head;
    ListNode prev = dummy;
    while (prev.next != null && prev.next.next != null) {
        ListNode a = prev.next, b = a.next;
        a.next = b.next;
        b.next = a;
        prev.next = b;
        prev = a;
    }
    return dummy.next;
}
ListNode oddEven(ListNode head) {
    if (head == null) return null;
    ListNode odd = head, even = head.next;
    ListNode evenHead = even;
    while (even != null && even.next != null) {
        odd.next = even.next;  odd = odd.next;
        even.next = odd.next;  even = even.next;
    }
    odd.next = evenHead;
    return head;
}`,
        js: `const swapPairs = (head) => {
    const dummy = new ListNode(0); dummy.next = head;
    let prev = dummy;
    while (prev.next && prev.next.next) {
        const a = prev.next, b = a.next;
        a.next = b.next;
        b.next = a;
        prev.next = b;
        prev = a;
    }
    return dummy.next;
};
const partition = (head, x) => {
    const lessD = new ListNode(0), geqD = new ListNode(0);
    let less = lessD, geq = geqD;
    while (head) {
        if (head.val < x) { less.next = head; less = head; }
        else              { geq.next = head; geq = head; }
        head = head.next;
    }
    geq.next = null;
    less.next = geqD.next;
    return lessD.next;
};`,
        c: `struct Node* partition(struct Node* head, int x) {
    struct Node less_d = {0, NULL}, geq_d = {0, NULL};
    struct Node *less = &less_d, *geq = &geq_d;
    while (head) {
        if (head->val < x) { less->next = head; less = head; }
        else               { geq->next = head; geq = head; }
        head = head->next;
    }
    geq->next = NULL;                  /* seal */
    less->next = geq_d.next;
    return less_d.next;
}`,
      },
      note: 'Every one of these returns dummy.next or head — never a chain tail. Before returning, re-derive in one sentence what the first node of the answer is; that habit catches 90% of "right algorithm, wrong head" bugs.',
    },
    {
      t: 'md',
      md: `
        ## Rotate right by k — the ring shortcut

        Move the last $k$ nodes to the front. Since rotating by the length is a no-op, first $k \\leftarrow k \\bmod n$ (needs one counting pass — the only way to get $n$). Then the two-write trick: **close the ring** (\`tail.next ← head\`), walk $n - k - 1$ hops to the new tail, **cut** (\`newTail.next ← null\`), return \`newTail.next\` as the new head. Closing the ring means the "wrap-around" is a pointer that already exists instead of a special case — the same philosophy as circular lists (page 4).

        **Cost:** two walks (length, then $n-k-1$ hops): O(n) time, O(1) space, zero node movement.

        ## Reorder L0→Ln→L1→Ln−1→… — the composition

        Given 1→2→3→4→5→6, produce 1→6→2→5→3→4. You cannot walk backwards, so make the back half walkable: **middle (fast/slow) → reverse the second half → zip the two halves alternately**. The zip loop saves both successors first (t1 = first.next, t2 = second.next), writes first.next ← second and second.next ← t1, then advances first ← t1, second ← t2 — stopping when the second (shorter-or-equal) chain exhausts.

        This problem is the topic's capstone because it uses NOTHING new: middle (page 6), reverse (page 5), two-chain threading (this page). If you can write all three primitives cold, reorder is ten lines. Interviewers know this — it is a composition test disguised as a hard problem.
      `,
    },
    {
      t: 'viz',
      algo: 'll-rotate',
      caption: 'k mod n first (try k = 12 on a 9-node list — it rotates by 3), then ring-close → walk to the new tail → one cut. Two writes move the whole tail to the front.',
    },
    {
      t: 'viz',
      algo: 'll-reorder',
      caption: 'The three-phase composition with a phase counter in the notes: middle, reverse-the-half (each flip a frame), then the zip with its save-both-successors rule. This is the capstone — pause at each phase boundary and name the primitive.',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Threading bugs',
      md: `- **Unsealed tails.** Any chain you grow must end with \`tail.next = null\` (partition's geq chain, reorder's zipped list ends naturally via exhaustion). An unsealed tail keeps its old next and re-drags the input sequence into the output — intermittent cycles, duplicated nodes.
- **Zip without saving successors:** writing \`first.next = second\` before saving t1 destroys first's route onward; the list truncates.
- **odd-even loop guard:** \`while (even && even->next)\` — with \`odd->next\` as the guard you dereference null on even-length lists.
- **Rotate forgetting k %= n:** k = n + 2 walks n − k − 1 < −1 hops — negative loop counts silently do nothing in most languages, returning an unrotated list (or worse, walking backwards off the head in hand-rolled versions).
- **Returning a tail.** After all this threading, the answer's head is dummy.next / lessD.next / newTail.next — pick deliberately and state it.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'swapPairs', time: 'O(n)', space: 'O(1)', note: '3 writes per pair' },
        { op: 'oddEven', time: 'O(n)', space: 'O(1)', note: 'one walk, one join write' },
        { op: 'partition (stable)', time: 'O(n)', space: 'O(1)', note: 'two chains + seal + concat' },
        { op: 'rotateRight', time: 'O(n)', space: 'O(1)', note: 'count + ring + cut' },
        { op: 'reorder', time: 'O(n)', space: 'O(1)', note: 'middle + reverse + zip' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `These five are the standard "medium-hard list manipulation" tier at FAANG: **swap pairs → reverse k-groups** is the ladder (page 5); **odd-even** tests guard discipline; **partition** tests whether you know stability is a property you can preserve for free on lists; **rotate** tests modular thinking; **reorder** tests composition. If asked reorder cold: say the three phases OUT LOUD before writing ("middle, reverse half, zip") — interviewers often interrupt with "good, that's the answer" once the plan is correct, because the plan IS the hard part. Follow-up on partition: "make it unstable but O(1) extra space" — it already is O(1); the trap is thinking partition needs an array like quicksort's does.`,
    },
    {
      t: 'check',
      ids: ['ll-q-pairs-trace', 'll-q-oddeven-trace', 'll-q-partition-trace', 'll-q-rotate-numeric', 'll-q-reorder-order', 'll-q-regroup-fill', 'll-q-regroup-multi'],
    },
  ],
}
