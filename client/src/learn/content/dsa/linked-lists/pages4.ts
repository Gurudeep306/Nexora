import type { Page } from '../../../types'

/* ═══════════════════════════════ 12. Lists with extra pointers ═══════════════════════════════ */

export const extraPointers: Page = {
  id: 'extra-pointers',
  title: 'Lists with extra pointers — random, child, digits',
  summary: 'Deep-copying a random-pointer list with the O(1)-space weave, flattening a multilevel list with a stack of return points, and adding reversed-digit numbers with a streaming carry — three problems where a second pointer changes everything.',
  minutes: 16,
  blocks: [
    {
      t: 'md',
      md: `
        Everything so far used exactly one pointer per node. Real structures — and the interview problems modelled on them — carry a second: a **random** pointer into anywhere in the list, a **child** pointer to a whole sublist, or digits that make the list a *number*. Each breaks an assumption you have been leaning on, and each has a canonical fix.

        ## Deep copy with random pointers

        Node: \`{ val, next, random }\` where random points at ANY node of the list (or null). Copy the structure so no node is shared. The next chain is easy — the hard part: when you clone node u, \`u'.random\` must point at the CLONE of u.random, which may not exist yet, and there is no index to look it up by.

        **Solution A (hash map, O(n) space):** pass 1 clones every node and stores original → clone in a map; pass 2 sets \`clone.next = map[u.next]\`, \`clone.random = map[u.random]\`. Simple, always works, say it first.

        **Solution B (the weave, O(1) space):** three passes over ONE list:

        1. **Weave:** after each original u, splice its clone u′: A→A′→B→B′→C→C′. Now "the clone of x" is exactly \`x->next\` — the list itself is the lookup table.
        2. **Random:** for each original u: \`u->next->random = u->random ? u->random->next : null\`. One hop from any original lands on its clone — no map.
        3. **Unweave:** restore every original's next (\`u->next = u->next->next\`) while threading the clones into their own chain. Two independent lists come out.

        *Why the weave is legitimate:* it temporarily corrupts the input — if another thread reads it mid-copy, it sees doubled nodes. In an interview, note this trade ("the map version doesn't touch the input; the weave needs exclusive access") — knowing when the clever solution is DISQUALIFIED is the senior signal. Both are O(n) time; the weave is O(1) space.

        ## Flatten a multilevel doubly list

        Nodes have \`prev, next, child\`; a child points at another (doubly linked) list that must be spliced **between the node and its next**, recursively: depth-first, children before the parent's own successor. The flattening walk:

        \`\`\`
        cur ← head; stack ← []
        while cur:
            if cur.child:
                if cur.next: push cur.next            # the return point
                cur.next ← cur.child; cur.child.prev ← cur
                cur.child ← null
            if cur.next = null and stack not empty:
                tail ← pop(); cur.next ← tail; tail.prev ← cur
            cur ← cur.next
        \`\`\`

        The stack holds exactly what recursion would hold on its frames: **the next pointers we must return to after a child chain finishes**. It IS the recursion, made explicit — which means it is also the answer to "do it without recursion" and the template for every DFS-with-resume you will write on trees and graphs later.

        ## Numbers as reversed-digit lists

        342 stored as 2→4→3 (ones digit first). Add two such numbers. The reversal is a gift: **school arithmetic proceeds from the ones digit**, which is the head — so the addition streams forward through both lists with a carry, no reversal needed:

        \`\`\`
        while a or b or carry:
            s ← carry + (a?.val or 0) + (b?.val or 0)
            append Node(s mod 10); carry ← s div 10
        \`\`\`

        The loop condition \`a || b || carry\` absorbs both ragged ends AND the final carry (999 + 1 = 1000 grows a digit) with zero special cases. **The forward-stored variant** (digits head-first: 3→4→2) is the famous follow-up: you need the ones digits first, so either reverse both lists (O(1) space, mutate), recurse to the end (O(n) stack), or copy to arrays (O(n) space). Naming all three options with costs is the complete answer.
      `,
    },
    {
      t: 'viz',
      algo: 'll-copy-random',
      caption: 'The weave in three passes: clones splice in behind their originals (A→A′→B→B′), each random copy becomes "one hop further" (u.random.next), then the unweave heals the originals and threads the clones. No hash map anywhere.',
    },
    {
      t: 'viz',
      algo: 'll-flatten',
      caption: 'Five fixed layouts of increasing nesting. Watch the pending-next stack: push when a child interrupts, pop when a level runs out — the explicit stand-in for the call stack. Layout 4 is a chain of children three deep.',
    },
    {
      t: 'viz',
      algo: 'll-add-numbers',
      caption: 'Digit-by-digit from the heads with the carry in the variables panel. Make the inputs 9 9 9 and 1 — watch the carry propagate through every position and the loop condition "a or b or carry" append the final 1.',
    },
    {
      t: 'code',
      title: 'The weave (five languages) — flatten and add in three, animation tabs have the rest',
      code: {
        cpp: `Node* copyRandomList(Node* head) {
    if (!head) return nullptr;
    for (Node* u = head; u; u = u->next->next) {     // pass 1: weave
        Node* c = new Node(u->val);
        c->next = u->next;
        u->next = c;
    }
    for (Node* u = head; u; u = u->next->next)       // pass 2: randoms
        u->next->random = u->random ? u->random->next : nullptr;
    Node dummy(0); Node* tail = &dummy;              // pass 3: unweave
    for (Node* u = head; u; u = u->next) {
        Node* c = u->next;
        u->next = c->next;                           // original healed…
        tail->next = c; tail = c;                    // …clone collected
    }
    return dummy.next;
}`,
        java: `Node copyRandomList(Node head) {
    if (head == null) return null;
    for (Node u = head; u != null; u = u.next.next) {
        Node c = new Node(u.val);
        c.next = u.next; u.next = c;
    }
    for (Node u = head; u != null; u = u.next.next)
        u.next.random = (u.random != null) ? u.random.next : null;
    Node dummy = new Node(0), tail = dummy;
    for (Node u = head; u != null; u = u.next) {
        Node c = u.next;
        u.next = c.next;
        tail.next = c; tail = c;
    }
    return dummy.next;
}`,
        python: `def copy_random_list(head):
    if not head: return None
    u = head
    while u:                              # weave
        c = Node(u.val)
        c.next = u.next
        u.next = c
        u = c.next
    u = head
    while u:                              # randoms
        u.next.random = u.random.next if u.random else None
        u = u.next.next
    dummy = Node(0); tail = dummy         # unweave
    u = head
    while u:
        c = u.next
        u.next = c.next
        tail.next = c; tail = c
        u = u.next
    return dummy.next`,
        js: `const copyRandomList = (head) => {
    if (!head) return null;
    for (let u = head; u; u = u.next.next) {
        const c = new Node(u.val);
        c.next = u.next; u.next = c;
    }
    for (let u = head; u; u = u.next.next)
        u.next.random = u.random ? u.random.next : null;
    const dummy = new Node(0); let tail = dummy;
    for (let u = head; u; u = u.next) {
        const c = u.next;
        u.next = c.next;
        tail.next = c; tail = c;
    }
    return dummy.next;
};`,
        c: `/* C has no Node class; assume struct RNode { int val; struct RNode *next, *random; }; */
struct RNode* copy_random_list(struct RNode* head) {
    for (struct RNode* u = head; u; u = u->next->next) {
        struct RNode* c = malloc(sizeof *c);
        c->val = u->val;
        c->next = u->next; u->next = c;
    }
    for (struct RNode* u = head; u; u = u->next->next)
        u->next->random = u->random ? u->random->next : NULL;
    struct RNode dummy = {0, NULL, NULL};
    struct RNode* tail = &dummy;
    for (struct RNode* u = head; u; u = u->next) {
        struct RNode* c = u->next;
        u->next = c->next;
        tail->next = c; tail = c;
    }
    return dummy.next;
}`,
      },
      note: 'The unweave loop advances u = u->next AFTER healing — at that moment u->next is already the NEXT ORIGINAL, so the stride is right without the ->next->next dance. Getting this stride wrong (advancing into a clone) is the classic weave bug; the animation shows both chains separating frame by frame.',
    },
    {
      t: 'code',
      title: 'Flatten (three languages) and add-two-numbers (three languages)',
      code: {
        cpp: `Node* flatten(Node* head) {
    Node* cur = head;
    stack<Node*> st;
    while (cur) {
        if (cur->child) {
            if (cur->next) st.push(cur->next);       // return point
            cur->next = cur->child;
            cur->child->prev = cur;
            cur->child = nullptr;
        }
        if (!cur->next && !st.empty()) {             // level exhausted
            Node* resume = st.top(); st.pop();
            cur->next = resume;
            resume->prev = cur;
        }
        cur = cur->next;
    }
    return head;
}

ListNode* addTwoNumbers(ListNode* a, ListNode* b) {
    ListNode dummy(0); ListNode* tail = &dummy;
    int carry = 0;
    while (a || b || carry) {                        // ragged ends + final carry
        int s = carry + (a ? a->val : 0) + (b ? b->val : 0);
        carry = s / 10;
        tail->next = new ListNode(s % 10);
        tail = tail->next;
        if (a) a = a->next;
        if (b) b = b->next;
    }
    return dummy.next;
}`,
        python: `def flatten(head):
    cur, stack = head, []
    while cur:
        if cur.child:
            if cur.next: stack.append(cur.next)
            cur.next = cur.child
            cur.child.prev = cur
            cur.child = None
        if not cur.next and stack:
            resume = stack.pop()
            cur.next = resume
            resume.prev = cur
        cur = cur.next
    return head

def add_two_numbers(a, b):
    dummy = Node(0); tail = dummy; carry = 0
    while a or b or carry:
        s = carry + (a.val if a else 0) + (b.val if b else 0)
        carry, digit = divmod(s, 10)
        tail.next = Node(digit); tail = tail.next
        a = a.next if a else None
        b = b.next if b else None
    return dummy.next`,
        java: `ListNode addTwoNumbers(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;
    int carry = 0;
    while (a != null || b != null || carry != 0) {
        int s = carry + (a != null ? a.val : 0) + (b != null ? b.val : 0);
        carry = s / 10;
        tail.next = new ListNode(s % 10);
        tail = tail.next;
        if (a != null) a = a.next;
        if (b != null) b = b.next;
    }
    return dummy.next;
}`,
      },
      note: 'Overflow note for add: the numbers can have hundreds of digits — converting to int/long is the trap the problem exists to prevent. Process digit by digit and you never hold the number at all.',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Extra-pointer traps',
      md: `- **Weave stride bug:** pass 2 and the unweave iterate originals; after weaving, an original's next is its CLONE. Pass 2 strides \`u = u->next->next\`; the unweave heals first and strides \`u = u->next\`. Mixing them up processes clones as originals.
- **Forgetting \`cur.child = null\`** in flatten: judges that verify the output structure reject leftover child pointers; conceptually the node keeps a dangling second route into the flattened region.
- **Flatten's doubly discipline:** every splice writes BOTH directions (\`cur.next = child; child.prev = cur\`; resume gets \`resume.prev = cur\`). Half-written doubly links are the page-4 disease again.
- **Add: stopping on \`a && b\`** instead of \`a || b || carry\`: ragged lengths lose the longer tail; a final carry (99+1) loses the new leading 1. Both are one-character fixes and both are favourite hidden tests.
- **Digits forward-stored:** do NOT reverse in place unless mutation is allowed; recursion needs the depth caveat; say which you pick and why.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'copyRandomList (weave)', time: 'O(n)', space: 'O(1)', note: '3 passes; mutates the input temporarily' },
        { op: 'copyRandomList (map)', time: 'O(n)', space: 'O(n)', note: 'never touches the input — parallel-safe' },
        { op: 'flatten', time: 'O(n)', space: 'O(depth)', note: 'explicit stack = recursion without recursion' },
        { op: 'addTwoNumbers', time: 'O(max(na, nb))', space: 'O(1) aux', note: 'output list excluded; never forms the number' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**Copy-random-pointer** is a favorite because it has a clean ladder: brute clone-then-search-for-random-target O(n²) → hash map O(n)/O(n) → weave O(n)/O(1). Climb it out loud. Follow-up: "without mutating the input and O(1) space?" — impossible in general (say so, and why: you need SOME original→clone association, and the input can't hold it). **Flatten multilevel** tests explicit-stack thinking — the same muscle as iterative tree DFS (Binary Trees topic). **Add two numbers** is the warm-up at many banks/fintechs; the real question is the forward-digit follow-up and refusing to overflow by converting.`,
    },
    {
      t: 'check',
      ids: ['ll-q-weave-order', 'll-q-weave-why', 'll-q-flatten-stack', 'll-q-add-carry', 'll-q-add-forward', 'll-q-extra-multi'],
    },
  ],
}

/* ═══════════════════════════════ 13. Cheatsheet ═══════════════════════════════ */

export const cheatsheet: Page = {
  id: 'cheatsheet',
  title: 'Linked lists cheatsheet',
  summary: 'Every pattern of the topic on one page: the recognition guide, the templates, the complexity ledger, the bug list, and the design patterns lists enable.',
  minutes: 15,
  blocks: [
    {
      t: 'md',
      md: `
        ## Recognition guide — "if the problem says X, think Y"

        | the problem says… | think | page |
        |---|---|---|
        | reverse / mirror the list | three-pointer flip; dummy if subrange | reversal |
        | reverse [m, n] / in k-groups | anchor + counted flips + two stitches | reversal |
        | middle in one pass | fast/slow, 2× speed | fast-slow-pointers |
        | nth from the end / delete nth from end | fixed-gap pointers; n+1 gap for deletion | fast-slow-pointers |
        | loop / cycle / "does it terminate" | Floyd; entrance via head-vs-meeting walk | cycle-detection |
        | palindrome with O(1) space | middle + reverse half + compare (+ restore) | palindrome-halves |
        | merge sorted lists / sort a list | tail-pointer merge; merge sort | merging-sort |
        | two lists share nodes | switch-partners (equal total routes) | two-lists |
        | remove duplicates, sorted | adjacent compare, don't advance after unlink | two-lists |
        | remove duplicates, unsorted | seen-set + dummy walk | two-lists |
        | group odds/evens, partition, rotate, reorder | thread chains, seal tails, concatenate | regrouping |
        | random pointer / deep copy | map, or weave for O(1) space | extra-pointers |
        | child lists / multilevel | explicit stack of return points | extra-pointers |
        | digits of a number | streaming carry; never form the number | extra-pointers |
        | head might be deleted or moved | **dummy head** — always | dummy-head |
        | delete/insert around current node | walk with PREV, not cur | dummy-head |
        | design: LRU, LFU, browser history, playlist | doubly list (+ hashmap for LRU) | doubly-circular |
        | round-robin / turn order / ring | circular list; stop rule is identity, not null | doubly-circular |

        ## The five templates that cover 90% of questions

        1. **Reversal** — \`prev/cur/nxt\`; save before flip; return prev.
        2. **Fast/slow** — guards decide parity: \`fast && fast->next\` (slow at 2nd middle) vs \`fast->next && fast->next->next\` (slow before the 2nd half).
        3. **Fixed gap** — first ahead n, slide both to first = null.
        4. **Dummy + prev walk** — candidate is \`prev->next\`; unlink without advancing prev; return \`dummy.next\`.
        5. **Thread chains** — grow with tail pointers, SEAL every tail (\`tail.next = null\`), concatenate last.
      `,
    },
    {
      t: 'complexity',
      title: 'The whole topic, one ledger',
      rows: [
        { op: 'reverse (iter / rec)', time: 'O(n)', space: 'O(1) / O(n) stack' },
        { op: 'reverseBetween(m,n)', time: 'O(n)', space: 'O(1)' },
        { op: 'reverseKGroup', time: 'O(n)', space: 'O(1)', note: 'node touched ≤ twice' },
        { op: 'middle / nth-from-end', time: 'O(n)', space: 'O(1)', note: 'one pass' },
        { op: 'Floyd detect / + entrance / + length', time: 'O(n)', space: 'O(1)' },
        { op: 'palindrome (reverse-half)', time: 'O(n)', space: 'O(1)' },
        { op: 'merge two lists', time: 'O(na+nb)', space: 'O(1)', note: 'stable if ties go left' },
        { op: 'merge sort (list)', time: 'O(n log n)', space: 'O(log n) stack' },
        { op: 'insertion sort (list)', time: 'O(n²)', space: 'O(1)', note: 'stable; great for small n' },
        { op: 'intersection (switch)', time: 'O(n+m)', space: 'O(1)' },
        { op: 'dedup sorted / unsorted', time: 'O(n)', space: 'O(1) / O(n)' },
        { op: 'swapPairs / oddEven / partition', time: 'O(n)', space: 'O(1)' },
        { op: 'rotateRight', time: 'O(n)', space: 'O(1)' },
        { op: 'reorder', time: 'O(n)', space: 'O(1)' },
        { op: 'copyRandom (weave / map)', time: 'O(n)', space: 'O(1) / O(n)' },
        { op: 'flatten multilevel', time: 'O(n)', space: 'O(depth)' },
        { op: 'addTwoNumbers', time: 'O(max)', space: 'O(1) aux' },
        { op: 'Josephus (sim / recurrence)', time: 'O(nk) / O(n)', space: 'O(n) / O(1)' },
      ],
    },
    {
      t: 'steps',
      title: 'The universal bug checklist (run it before saying "done")',
      items: [
        { title: 'Empty list', md: 'head = null — does every branch survive it?' },
        { title: 'One node', md: 'head->next = null — pairs, middles, reversals all degenerate here.' },
        { title: 'Two nodes', md: 'the merge-sort split guard and swap-pairs both live or die here.' },
        { title: 'Head changes', md: 'did you return the NEW head (dummy.next / prev), and did the caller rebind?' },
        { title: 'Write order', md: 'every overwrite: was everything it needed read first? (nxt before flip; n.next before p.next.)' },
        { title: 'Tails sealed', md: 'every grown chain ends in null; every ring you closed got cut.' },
        { title: 'prev after unlink', md: 'prev does NOT advance past an unlinked candidate.' },
        { title: 'Identity vs value', md: 'pointer comparisons compare ADDRESSES (Python: is, not ==).' },
        { title: 'Restored?', md: 'query functions that mutated the list put it back.' },
        { title: 'Freed?', md: 'C/C++: every unlinked node is freed; nothing is freed twice.' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Design patterns lists enable (where the topic goes next)

        - **LRU cache** — hashmap key→node + doubly list by recency; every op O(1). The doubly-ness is mandatory (evict/move a HELD node). Built in the Hashing topic.
        - **Skip list** — sorted singly lists stacked as express lanes, each node promoted with probability ½: O(log n) expected search/insert/delete with O(1) splices. Redis's sorted sets are a skip list.
        - **Unrolled linked list** — nodes hold small ARRAYS of elements: keeps O(1) splices, regains cache locality. The honest hybrid of this topic's first page.
        - **XOR list** — a "doubly" list storing \`prev XOR next\` in one field: two-way traversal with singly-list memory. A bits-topic cameo.
        - **Adjacency lists** — graphs stored as an array of linked lists of edges: the Graphs topic's default representation.
        - **Free lists** — allocators chain freed blocks through their own bodies; \`malloc\`'s internals are a linked-list algorithm.
        - **Kernel queues** — Linux's \`list_head\` embeds the LINKS inside your struct (intrusive lists): splicing two lists is O(1) and no element is ever copied — the industrial endpoint of "nodes, not values".

        ## The one-paragraph theory

        A linked list trades **locality for mutability**: an array is one contiguous block where position is arithmetic and change is expensive (shifts); a list is a scattered chain where position is a walk and change is two writes. Every algorithm in this topic is a consequence: the walk-based algorithms (traversal, search, Floyd) pay the locality price once per node; the splice-based algorithms (insert, delete, merge, partition, reorder) collect the mutability payoff with zero data movement; and the two-pointer family exists precisely because positions cannot be computed, only *related* — twice as fast, exactly n behind, equal total distance. Master the five templates, run the ten-point checklist, and every list problem becomes assembly.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'The 30-second self-test before any list interview',
      md: `Write from memory, no hints: (1) iterative reverse, (2) middle with the correct guard for YOUR split convention, (3) merge of two sorted lists with the tie rule, (4) Floyd detect + entrance, (5) removeAll with a dummy. Ten minutes, five functions. If any one is shaky, re-run its animation on this topic's pages and rewrite it — these five are the atoms; everything else on the cheatsheet is molecules made of them.`,
    },
    {
      t: 'check',
      ids: ['ll-q-cheat-match', 'll-q-cheat-multi', 'll-q-cheat-pick', 'll-q-cheat-complexity', 'll-q-cheat-order', 'll-q-cheat-fill', 'll-q-cheat-lru'],
    },
  ],
}
