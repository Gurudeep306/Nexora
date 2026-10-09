import type { Page } from '../../../types'

/* ═══════════════════════════════ 1. Why linked lists ═══════════════════════════════ */

export const whyLinkedLists: Page = {
  id: 'why-linked-lists',
  title: 'Why linked lists exist',
  summary: 'What a pointer really buys you, the memory picture behind arrays and lists, the exact operations where each wins, and why interviewers keep asking list questions even though nobody ships them.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        An array stores its elements in one unbroken block of memory. That is its superpower and its trap. The superpower: element $i$ lives at address $\\text{base} + i \\cdot \\text{size}$, one multiply and one add away — **random access is arithmetic**. The trap: the block must be reserved in advance, contiguously, and inserting into the middle means physically dragging every later element one slot right.

        Ask a concrete question. You maintain a playlist of 10 million songs and a user drops a song at position 5,000,000. An array shifts ~5,000,000 elements: milliseconds of pure copying, and if the array is full, a reallocation that copies *everything*. What you actually wanted to change is tiny: *which song comes after which*.

        A **linked list** stores exactly that relationship and nothing else. Each element lives in its own **node** — the value plus a pointer to the next node — allocated wherever memory happens to be free. To insert, you allocate one node and rewrite two pointers. To delete, you rewrite one. **The cost of changing the sequence is independent of the sequence's length.** That single sentence is the entire reason linked lists exist.

        The price: there is no formula for "node 5,000,000". You start at the first node and follow 5,000,000 pointers, each hop landing at an address you could not predict. Random access degrades from O(1) to O(n) — and, worse in practice, each hop is likely a cache miss.
      `,
    },
    {
      t: 'viz',
      algo: 'll-memory',
      caption: 'Top: the array as one contiguous block — index k is one arithmetic step. Bottom: the same values in a list, scattered — reaching index k costs k unpredictable pointer hops. Set k high and watch the cost meter diverge.',
    },
    {
      t: 'md',
      md: `
        ## The node

        A node is a small record: the **value** (any payload) and one or more **links**. In C it is the canonical struct; in managed languages the runtime allocates it on the heap and the garbage collector reclaims it when no pointer reaches it.

        These definitions are used by every code block in this topic:
      `,
    },
    {
      t: 'code',
      title: 'The node, in all five languages (memorise these — interviews assume them)',
      code: {
        cpp: `struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x) : val(x), next(nullptr) {}
};
// lists are identified by their head pointer:
ListNode* head = nullptr;               // empty list`,
        java: `class ListNode {
    int val;
    ListNode next;
    ListNode(int x) { val = x; }
}
// a list is just its head reference:
ListNode head = null;                   // empty list`,
        python: `class Node:
    __slots__ = ('val', 'next')
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

head = None                             # empty list`,
        js: `class ListNode {
    constructor(val, next = null) {
        this.val = val;
        this.next = next;
    }
}
let head = null;                        // empty list`,
        c: `struct Node {
    int val;
    struct Node* next;
};
/* allocate: */
struct Node* n = malloc(sizeof(struct Node));
n->val = 42; n->next = NULL;
struct Node* head = NULL;               /* empty list */`,
      },
      note: 'A list is never "the nodes" — it is the head pointer plus whatever the next-chain reaches. Lose the head and the list is gone; break a next and everything after the break is unreachable (a memory leak in C, garbage in managed languages).',
    },
    {
      t: 'md',
      md: `
        ## Where each structure wins

        | operation | array | singly linked list | why |
        |---|---|---|---|
        | access index $i$ | **O(1)** | O(i) | address arithmetic vs pointer chasing |
        | insert/delete at front | O(n) shift | **O(1)** | shift everything vs rewrite head |
        | insert/delete at back | amortized O(1) | O(n) singly / **O(1)** with tail ptr | append into spare capacity vs find the tail |
        | insert/delete at a **held** position | O(n) shift | **O(1)** | shift the tail vs 1–2 pointer writes |
        | search unsorted | O(n) | O(n) | both must look at everything |
        | memory per element | size | size + pointer (+ allocator overhead) | links are not free |
        | cache behaviour | **excellent** (prefetchable) | poor (scattered nodes) | hardware prefetch loves contiguity |

        Two rows deserve emphasis because they are the whole story:

        1. **"At a held position" is the list's only real win.** If you already have a pointer to the node *before* the change, insert and delete are O(1) with zero data movement. Arrays cannot do better than O(n) there, no matter what. Every genuinely list-shaped problem — splicing streams, LRU eviction, skip-list layers, kernel scheduling queues — exploits exactly this.
        2. **Constant factors matter.** In benchmarks, arrays beat linked lists for almost every *whole-sequence* operation (sum, search, even insertion-heavy workloads) because one cache miss (~100 cycles) costs more than dozens of sequential slot copies. Sedgewick's measurements and Bjarne Stroustrup's famous talk both make this point: *prefer arrays by default; reach for links when the O(1) splice is the actual requirement.*

      `,
    },
    {
      t: 'viz',
      algo: 'll-insert-cost',
      caption: 'The same middle insertion in both structures, every unit of work counted on the meter: the array shifts n − p elements one write at a time; the list walks p nodes, then pays exactly TWO writes regardless of n. Try p = 0 (front: the list’s landslide win) and p near the end (back: the array wins).',
    },
    {
      t: 'md',
      md: `
        ## Then why do interviews love them?

        Because they are the purest test of **pointer discipline**. A linked-list bug is never subtle arithmetic — it is a lost node, a broken order of writes, a null dereference on the empty or one-element list. Someone who manipulates five pointers without panicking will manipulate five references, five file handles, or five tree nodes without panicking. Linked lists are where that muscle is built, which is why reversal, cycle detection and merging appear at nearly every company — and why this topic teaches every one of them twice: iteratively *and* with the invariant stated out loud.
      `,
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'The invariant habit',
      md: `Every correct list algorithm maintains a sentence that is true before each loop iteration and still true after. Reverse: *"left of cur all arrows point backwards; right of cur untouched."* Merge: *"the result is sorted and contains exactly the nodes consumed so far."* State yours before you type. When a list interview goes wrong, it is almost always because the invariant was never written down — and the pointer order that preserves it was guessed.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'access by index', time: 'O(n)', space: 'O(1)', note: 'i hops for index i; arrays do it in O(1)' },
        { op: 'insert/delete at head', time: 'O(1)', space: 'O(1)', note: 'two writes / one write + free' },
        { op: 'insert/delete at a held node', time: 'O(1)', space: 'O(1)', note: 'the list’s signature move' },
        { op: 'search', time: 'O(n)', space: 'O(1)', note: 'no indexing without extra structure' },
        { op: 'traverse whole list', time: 'O(n)', space: 'O(1)', note: 'with a large constant-factor penalty vs arrays' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Why would you ever use a linked list over an array?"** Never answer "insertion is O(1)" alone — the interviewer knows about the cache penalty and is fishing for nuance. Full answer: when you hold a reference to the splice point and mutate the sequence constantly (LRU caches, editor buffers, OS run queues), when elements are large and copying them is expensive but copying a pointer is not, or when you need stable addresses — nodes never move, so external pointers into the structure stay valid across insertions (arrays invalidate every index on realloc).`,
    },
    {
      t: 'check',
      ids: ['ll-q-mem-why', 'll-q-mem-cost', 'll-q-mem-cache', 'll-q-mem-valid', 'll-q-mem-match', 'll-q-mem-splice', 'll-q-mem-node-bytes'],
    },
  ],
}

/* ═══════════════════════════════ 2. Singly linked lists ═══════════════════════════════ */

export const singlyLinked: Page = {
  id: 'singly-linked',
  title: 'Singly linked lists: the four operations and the write-order rule',
  summary: 'Push front, push back, insert-after, delete-after as pointer surgery; the one rule about write order; traversals; and the O(n) walk that every other operation hides inside it.',
  minutes: 15,
  blocks: [
    {
      t: 'md',
      md: `
        Every singly linked list operation is one of two shapes: a **walk** (follow next until some condition) and a **splice** (rewrite next pointers). Splices are O(1); walks are O(n). Nearly every cost in this topic is really "how long is the walk, and can it be avoided?"

        ## The four primitives

        **Push front.** The only O(1)-at-the-front operation any basic structure offers besides a deque: allocate, link the new node to the old head, move head.

        **Push back.** Walk to the node whose next is null (the tail), link the new node there. The walk is the cost — O(n) per push, O(n²) to build a list naively. Keeping a **tail pointer** alongside head turns it into O(1); that is what a real queue implementation does (Queues topic).

        **Insert after a held node p.** Two writes — and their ORDER is the first classic bug:

        $$n.\\text{next} \\leftarrow p.\\text{next} \\quad\\text{then}\\quad p.\\text{next} \\leftarrow n.$$

        Reverse the order and $p$'s old successor is unreachable before $n$ ever learns its address: the list is truncated and the tail leaks. **Write the new node's pointer before overwriting anything it needed to read.** This rule generalises to every algorithm in the topic — reversal, splicing, unweaving — and the animations flag every such line.

        **Delete after a held node p.** Remember the victim ($v = p.\\text{next}$), redirect ($p.\\text{next} = v.\\text{next}$), free $v$. Again two reads before any write: you must know the victim and its successor before you overwrite the pointer that leads to them.
      `,
    },
    {
      t: 'viz',
      algo: 'll-insert-delete',
      caption: 'All four primitives on one list. Watch the pointer labels: on insertAfter, n.next is written BEFORE p.next — the animation shows the list intact at every single frame.',
    },
    {
      t: 'code',
      title: 'The four primitives (C++ shown; the animation tabs have all five languages)',
      code: {
        cpp: `void pushFront(ListNode*& head, int x) {
    ListNode* n = new ListNode(x);
    n->next = head;            // read-then-write: n learns the old head…
    head = n;                  // …only now may head move
}

void pushBack(ListNode*& head, ListNode*& tail, int x) {
    ListNode* n = new ListNode(x);
    if (!head) { head = tail = n; return; }   // empty list: both pointers
    tail->next = n;
    tail = n;                                 // O(1) WITH a tail pointer
}

void insertAfter(ListNode* p, int x) {
    ListNode* n = new ListNode(x);
    n->next = p->next;         // (1) new node reads the future
    p->next = n;               // (2) then the list is rewired
}

bool deleteAfter(ListNode* p) {
    if (!p->next) return false;
    ListNode* victim = p->next;
    p->next = victim->next;    // skip over
    delete victim;             // C/C++ only; managed runtimes collect
    return true;
}`,
        java: `// Java: pushFront must RETURN the new head (references are by value)
ListNode pushFront(ListNode head, int x) {
    ListNode n = new ListNode(x);
    n.next = head;
    return n;
}
// or mutate a holder object / field instead of returning`,
        python: `def push_front(head, x):
    n = Node(x)
    n.next = head
    return n          # caller rebinds: head = push_front(head, x)`,
        js: `const pushFront = (head, x) => {
    const n = new ListNode(x);
    n.next = head;
    return n;
};`,
        c: `struct Node* push_front(struct Node* head, int x) {
    struct Node* n = malloc(sizeof *n);
    n->val = x;
    n->next = head;
    return n;
}`,
      },
      note: 'Language trap: in Java/Python/JS a function receives a COPY of the head reference. Assigning to the parameter changes nothing outside. Either return the new head (and rebind at the call site) or pass a holder — C++ can take ListNode*& instead. Forgetting this is the #1 "my insertion did nothing" bug.',
    },
    {
      t: 'md',
      md: `
        ## Traversal — the loop shape that must be automatic

        \`\`\`
        cur ← head
        while cur ≠ null:
            visit(cur)
            cur ← cur.next
        \`\`\`

        Three variants, all of which appear constantly:

        - **Visit-with-previous** (\`while (cur->next)\` looking at \`cur->next\`): needed whenever you might delete or insert around the *current* node, because a singly list has no back pointer. This is why the delete-by-value and partition algorithms carry a \`prev\`.
        - **Lookahead-two** (\`while (cur && cur->next)\` touching \`cur->next->val\`): pairwise work — swap pairs, remove duplicates from a sorted list.
        - **Do-while** (\`do … while (cur != head)\`): circular lists only, where null never arrives (page 4).

        **Cost derivation for building a list.** Pushing $n$ items to the front: $n$ allocations, 2 writes each, no walks — O(n) total. Pushing to the back without a tail pointer: the $i$-th push walks $i-1$ nodes, so total work is $\\sum_{i=1}^{n}(i-1) = \\frac{n(n-1)}{2} \\in \\Theta(n^2)$. With a tail pointer it is O(n) again. That sum is worth remembering — quadratic-by-accident list building is a real bug in real code, and interviewers set it as a trap ("what is the complexity of your buildList function?").
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'The five crashes',
      md: `1. **Null head.** Every walk needs \`while (cur != null)\`, and every function needs a decision about the empty list — return null? 0? throw? Decide before coding; saying it out loud scores points.
2. **One-element list.** \`head->next\` is null: swap-pairs, reversal-of-groups, and middle-finding all have a special case hiding here.
3. **Deleting the head** with prev-based code — prev doesn't exist (fixed by the dummy node, next page).
4. **Dereferencing after moving**: \`cur = cur->next; use(cur->val)\` when cur is now null.
5. **Losing the rest of the list** by writing \`p->next = n\` before \`n->next = p->next\`. Read before write, always.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'pushFront', time: 'O(1)', space: 'O(1)' },
        { op: 'pushBack (no tail ptr)', time: 'O(n)', space: 'O(1)', note: 'Θ(n²) to build n nodes' },
        { op: 'pushBack (tail ptr)', time: 'O(1)', space: 'O(1)' },
        { op: 'insertAfter(p) / deleteAfter(p)', time: 'O(1)', space: 'O(1)', note: 'p already held' },
        { op: 'insert/delete at index i', time: 'O(i)', space: 'O(1)', note: 'walk dominates' },
        { op: 'search by value', time: 'O(n)', space: 'O(1)' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**Typical opener:** "Implement a linked list with insert/delete/search." The interviewer is watching four things: the empty-list case, the write-order rule, whether you return or mutate head correctly in the language you chose, and whether you free memory in C/C++. Say the invariant aloud ("after this line, the list is whole again") — it converts a coding task into a conversation about correctness. Follow-up to expect: "make pushBack O(1)" → tail pointer → "now make it a queue" → the Queues topic.`,
    },
    {
      t: 'check',
      ids: ['ll-q-singly-order', 'll-q-singly-pushback', 'll-q-singly-byvalue', 'll-q-singly-fill', 'll-q-singly-ops', 'll-q-singly-order-steps', 'll-q-singly-build-quad', 'll-q-singly-tail-o1'],
    },
  ],
}

/* ═══════════════════════════════ 3. The dummy head ═══════════════════════════════ */

export const dummyHead: Page = {
  id: 'dummy-head',
  title: 'The dummy head — one trick that deletes every special case',
  summary: 'Why the head is always the awkward node, how a sentinel makes head-deletion an ordinary deletion, the exact lifetime rules, and sorted insertion as the first payoff.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        Look at any deletion or insertion algorithm written without a sentinel and count its cases:

        - deleting the first occurrence of a value: *if it is the head, move head; else fix prev->next.*
        - inserting into a sorted list: *if smaller than the head, it becomes the head; else splice after prev.*
        - swapping pairs: *if the first pair moves, head changes.*

        Every one of these is the same awkwardness: **the head has no node before it**, so "fix the previous node's next" has nothing to fix. Code that special-cases it doubles in length and doubles in bug surface — the head branch is exactly the branch that runs on one-element lists, the ones people test last.

        ## The fix

        Allocate one extra node, the **dummy** (sentinel, sentinel head, fake head), whose next is the real head. Now *every* real node has a node before it, and "fix prev->next" works uniformly — including when prev is the dummy. At the end, return \`dummy.next\` and let the dummy die.

        The invariant upgrades too. Without a dummy: *"the prefix up to prev is correct."* With one: *"the prefix up to prev is correct, and prev might be the dummy — no case analysis needed."*
      `,
    },
    {
      t: 'viz',
      algo: 'll-delete-value',
      caption: 'Deleting every 2 from a list that STARTS with 2 — the case that breaks dummy-less code. Note two subtleties the notes call out: prev does not advance after a deletion, and the answer is dummy.next, not the original head.',
    },
    {
      t: 'code',
      title: 'Delete-by-value and sorted insert, both sentinel-anchored',
      code: {
        cpp: `// remove every node with value x — head deletions need no special case
ListNode* removeAll(ListNode* head, int x) {
    ListNode dummy(0);                 // stack-allocated sentinel
    dummy.next = head;
    ListNode* prev = &dummy;
    while (prev->next) {
        if (prev->next->val == x)
            prev->next = prev->next->next;   // prev stays: new next unchecked
        else
            prev = prev->next;
    }
    return dummy.next;                 // may be null — all deleted
}

// insert x keeping sorted order; returns (possibly new) head
ListNode* sortedInsert(ListNode* head, int x) {
    ListNode dummy(INT_MIN);
    dummy.next = head;
    ListNode* prev = &dummy;
    while (prev->next && prev->next->val < x)
        prev = prev->next;
    ListNode* n = new ListNode(x);
    n->next = prev->next;
    prev->next = n;
    return dummy.next;
}`,
        java: `ListNode removeAll(ListNode head, int x) {
    ListNode dummy = new ListNode(0);
    dummy.next = head;
    ListNode prev = dummy;
    while (prev.next != null) {
        if (prev.next.val == x)
            prev.next = prev.next.next;
        else
            prev = prev.next;
    }
    return dummy.next;
}`,
        python: `def remove_all(head, x):
    dummy = Node(0)
    dummy.next = head
    prev = dummy
    while prev.next:
        if prev.next.val == x:
            prev.next = prev.next.next
        else:
            prev = prev.next
    return dummy.next`,
        js: `const removeAll = (head, x) => {
    const dummy = new ListNode(0);
    dummy.next = head;
    let prev = dummy;
    while (prev.next) {
        if (prev.next.val === x) prev.next = prev.next.next;
        else prev = prev.next;
    }
    return dummy.next;
};`,
        c: `struct Node* remove_all(struct Node* head, int x) {
    struct Node dummy = {0, NULL};     /* sentinel on the stack */
    dummy.next = head;
    struct Node* prev = &dummy;
    while (prev->next) {
        if (prev->next->val == x) {
            struct Node* victim = prev->next;
            prev->next = victim->next;
            free(victim);
        } else {
            prev = prev->next;
        }
    }
    return dummy.next;
}`,
      },
      note: 'C++/C: prefer a STACK sentinel (ListNode dummy(0)) over new ListNode(0) — no matching delete, no leak on early return. The dummy must never be returned or exposed: callers get dummy.next.',
    },
    {
      t: 'steps',
      title: 'Dummy-head discipline (four rules)',
      items: [
        { title: 'Create', md: 'First line of the function: \`dummy.next = head\`. Stack-allocate in C++/C.' },
        { title: 'Walk with prev', md: 'The loop variable is always the node BEFORE the one under inspection — \`prev->next\` is the candidate. Never walk with the candidate itself when you might unlink it.' },
        { title: 'Do not advance past a deletion', md: 'After \`prev->next = prev->next->next\`, the NEW \`prev->next\` has never been examined. Advancing prev here is the classic "missed consecutive duplicates" bug (deleting 2-2-2 removes only the first).' },
        { title: 'Return dummy.next', md: 'Not \`head\` — head may have been deleted. Not \`dummy\` — the sentinel is scaffolding, not data.' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Why sorted insert stops early

        On a sorted list, the walk condition is \`prev->next->val < x\`: the first node that is $\\ge x$ is exactly where $x$ belongs. Correctness is the invariant *every node up to prev is < x; every node from prev->next on is ≥ x*, so splicing between them keeps the list sorted — including ties, which land after the equals (stable). On an **unsorted** list no early stop exists: you must reach the end to know the insertion point is the end, so unsorted insert-at-position and sorted insert differ only in the loop condition, but that condition is what makes binary-search-like behaviour possible at all. (A sorted list still cannot binary search — you cannot jump to the middle. Skip lists, an advanced topic, add express lanes to fix precisely that.)

        **Cost:** sorted insert is O(n) worst case (x is the new maximum), O(1) best (x is the new minimum), average O(n) for random data — the walk is a linear scan. The win over a sorted *array* is that the splice itself moves nothing: an array pays another O(n) in element shifts on top of the O(n) search (binary search helps the array's search, not its shifting).
      `,
    },
    {
      t: 'viz',
      algo: 'll-sorted-insert',
      caption: 'Insert 4 into a sorted list: the walk stops at the first node ≥ 4 and the splice is two writes. Try x smaller than everything and larger than everything — the dummy absorbs both extremes with zero case analysis.',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'When the dummy bites back',
      md: `The dummy makes prev-based code uniform, but it must not **escape**. Two real bugs: returning \`dummy\` instead of \`dummy.next\` (callers see a ghost leading 0 — judges report "wrong answer on every test"), and heap-allocating the dummy in C++ then returning early on some path (leak). Also, a stack dummy's address is fine to store in pointers *within the call* — it dies with the frame, and so does every pointer to it.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'removeAll(head, x)', time: 'O(n)', space: 'O(1)', note: 'one pass; dummy is constant space' },
        { op: 'sortedInsert', time: 'O(n) worst / O(1) best', space: 'O(1)', note: 'linear scan + 2 writes' },
        { op: 'delete head (with sentinel)', time: 'O(1)', space: 'O(1)', note: 'no longer a special case' },
      ],
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Remove all nodes with value k."** The interviewer wants to see whether you special-case the head (fine, but longer) or reach for the dummy (better). Announce it: "I'll use a sentinel so head-deletion isn't a case." Follow-ups: "remove only the first occurrence" (break after one deletion), "remove duplicates from a SORTED list" (compare prev->next with prev->next->next instead of a value), "…so that only DISTINCT values remain, even non-adjacent ones" (needs a hash set — Hashing topic). The dummy is the through-line in all of them.`,
    },
    {
      t: 'check',
      ids: ['ll-q-dummy-why', 'll-q-dummy-return', 'll-q-dummy-consecutive', 'll-q-dummy-fill', 'll-q-dummy-multi', 'll-q-dummy-sorted-numeric', 'll-q-dummy-leak'],
    },
  ],
}

/* ═══════════════════════════════ 4. Doubly & circular lists ═══════════════════════════════ */

export const doublyCircular: Page = {
  id: 'doubly-circular',
  title: 'Doubly linked and circular lists',
  summary: 'What the prev pointer buys (O(1) delete of any held node, backward walks), the four-write insert with its exact order, circular lists and their walk discipline, and the Josephus problem as the canonical application.',
  minutes: 14,
  blocks: [
    {
      t: 'md',
      md: `
        A singly list's deepest limitation: given a node, you cannot find its predecessor without an O(n) walk from the head. Deletion shows the cost — \`deleteAfter(p)\` is O(1), but "delete THIS node" is O(n) unless you happen to hold the node before it.

        A **doubly linked list** stores \`prev\` beside \`next\` in every node:

        \`\`\`
        struct DNode { int val; DNode* prev; DNode* next; };
        \`\`\`

        Now deleting a **held** node touches exactly its two neighbours:

        $$p.\\text{next} \\leftarrow d.\\text{next}, \\qquad (d.\\text{next}).\\text{prev} \\leftarrow p$$

        (with the two null cases: $d$ is head, $d$ is tail). **O(1), no walk, given the node.** This is not a curiosity — it is the mechanism under LRU caches (evict any held entry instantly), browser histories (go back), text-editor buffers (cursor moves both ways), and every deque implementation in every standard library: C++ \`std::list\`, Java \`LinkedList\` and \`ArrayDeque\`'s cousin designs, Python's \`collections.deque\`.

        The bill: an extra pointer per node (8 bytes on 64-bit — often more than the payload itself for ints), two writes per link instead of one, and more invariants to keep consistent. **A doubly list is only correct if prev and next agree at every moment**: $u.\\text{next} = v \\iff v.\\text{prev} = u$.
      `,
    },
    {
      t: 'code',
      title: 'Doubly linked insert-between and delete — the exact write order',
      code: {
        cpp: `struct DNode { int val; DNode* prev; DNode* next;
               DNode(int x) : val(x), prev(nullptr), next(nullptr) {} };

// insert n strictly between a and b (= a->next); b may be null (tail insert)
void insertBetween(DNode* a, DNode* b, DNode* n) {
    n->prev = a;               // (1) new node learns both neighbours…
    n->next = b;               // (2) …before any existing link is touched
    a->next = n;               // (3) forward chain sees n
    if (b) b->prev = n;        // (4) backward chain sees n (b null ⇒ n is tail)
}

// delete held node d; head/tail are by-reference so extremes can move
void erase(DNode*& head, DNode*& tail, DNode* d) {
    if (d->prev) d->prev->next = d->next;   else head = d->next;
    if (d->next) d->next->prev = d->prev;   else tail = d->prev;
    delete d;
}`,
        java: `static class DNode { int val; DNode prev, next; DNode(int x) { val = x; } }

static void insertBetween(DNode a, DNode b, DNode n) {
    n.prev = a; n.next = b;        // new node first
    a.next = n;
    if (b != null) b.prev = n;
}

static DNode erase(DNode head, DNode d) {     // returns (possibly new) head
    if (d.prev != null) d.prev.next = d.next; else head = d.next;
    if (d.next != null) d.next.prev = d.prev;
    return head;
}`,
        python: `class DNode:
    __slots__ = ('val', 'prev', 'next')
    def __init__(self, x):
        self.val, self.prev, self.next = x, None, None

def insert_between(a, b, n):
    n.prev, n.next = a, b
    a.next = n
    if b: b.prev = n

def erase(head, d):
    if d.prev: d.prev.next = d.next
    else:      head = d.next
    if d.next: d.next.prev = d.prev
    return head`,
        js: `class DNode {
    constructor(x) { this.val = x; this.prev = null; this.next = null; }
}
const insertBetween = (a, b, n) => {
    n.prev = a; n.next = b;
    a.next = n;
    if (b) b.prev = n;
};
const erase = (head, d) => {
    if (d.prev) d.prev.next = d.next; else head = d.next;
    if (d.next) d.next.prev = d.prev;
    return head;
};`,
        c: `struct DNode { int val; struct DNode *prev, *next; };

void insert_between(struct DNode* a, struct DNode* b, struct DNode* n) {
    n->prev = a; n->next = b;
    a->next = n;
    if (b) b->prev = n;
}

struct DNode* erase(struct DNode* head, struct DNode* d) {
    if (d->prev) d->prev->next = d->next; else head = d->next;
    if (d->next) d->next->prev = d->prev;
    free(d);
    return head;
}`,
      },
      note: 'Why write n’s pointers FIRST? Between writes (1)–(2) and (3)–(4) the structure is inconsistent; doing them in this order means the new node is fully informed before the old links move, and a concurrent reader walking either direction never lands on a half-built node (this is exactly how lock-free list algorithms order their writes, with CAS instead of assignment).',
    },
    {
      t: 'viz',
      algo: 'll-doubly-ops',
      caption: 'Insert-at-index then delete, all four writes shown separately with the arrows they light up. Watch the backward (prev) arrows heal right after the forward ones — consistency restored after every write pair.',
    },
    {
      t: 'md',
      md: `
        ## Circular lists

        A **circular** list connects the tail back to the head (singly: \`tail->next = head\`; doubly: also \`head->prev = tail\`). There is no null anywhere. What changes:

        - **Traversal** can never test for null. The stop rule is identity: \`do { … cur = cur->next; } while (cur != head);\` — or keep a count. A \`while (cur)\` loop on a circular list is an infinite loop, and on a *corrupted* singly list (an accidental cycle) it is the hang you must detect with Floyd's algorithm (page 7).
        - **There is no "end"** to fall off, which makes rotation natural: to rotate a list, close the ring, walk to the new tail, cut once (page 11 animates exactly this).
        - **Head choice is arbitrary** — the ring is the structure; "head" is just where you started looking. Circular doubly lists often keep a distinguished sentinel node instead (the design inside many STL implementations), so "empty" means \`sentinel->next == sentinel\`.

        ### Where they earn their keep

        Round-robin scheduling (the OS cycles through runnable processes forever), multiplayer turn order, ring buffers conceptually (though real ring buffers use an array + modular indices — Queues topic), buffer pools, and any "next after the last is the first" domain. The Josephus problem below is the classic exercise.

        ## Josephus — elimination on a ring

        $n$ people stand in a circle; counting starts at person 1 and every $k$-th person is eliminated; the survivor wins. On a circular list: hold \`cur\` at the person *before* the next victim, count $k-1$ hops, unlink \`cur->next\` in O(1), repeat until one node remains. Each elimination is one pointer write — an array would shift O(n) per elimination for $O(n^2)$ total.

        There is also a beautiful O(n) recurrence with no structure at all. Number seats $0 \\dots n-1$. After the first elimination (seat $(k-1) \\bmod n$), the circle "restarts" at seat $k \\bmod n$, and the remaining problem is the same game on $n-1$ people with a rotation:

        $$J(1, k) = 0, \\qquad J(n, k) = \\big(J(n-1, k) + k\\big) \\bmod n.$$

        *Why it is correct:* map the survivor's seat $s$ in the $(n-1)$-game back to the original numbering: after removing seat $(k-1)\\bmod n$, seat $j$ of the smaller game is seat $(j + k) \\bmod n$ of the original — unwinding that shift one elimination at a time gives the recurrence. Add 1 at the end for 1-based answers.
      `,
    },
    {
      t: 'viz',
      algo: 'll-circular-build',
      caption: 'Building the ring: notice each append keeps the circle closed at every frame. Then the walk — the stop rule is "back to head", not null. Try to convince yourself a while(cur != null) loop here never terminates.',
    },
    {
      t: 'viz',
      algo: 'll-josephus',
      caption: 'n = 7, k = 3 by default: the survivor is person 4 (check: J(7,3) via the recurrence gives seat 3, +1 = 4). Watch each elimination become a single unlink. Try k = 1 (survivor is trivially the last person) and k = 2 (the powers-of-two pattern emerges).',
    },
    {
      t: 'code',
      title: 'Josephus — both the list simulation and the O(n) recurrence',
      code: {
        cpp: `// simulation: O(n·k) pointer hops
int josephusSim(int n, int k) {
    Node* head = new Node(1); head->next = head;
    Node* tail = head;
    for (int v = 2; v <= n; v++) {
        tail->next = new Node(v);
        tail = tail->next;
        tail->next = head;                 // ring stays closed
    }
    Node* cur = head;
    while (cur->next != cur) {             // more than one left
        for (int i = 1; i < k; i++) cur = cur->next;   // count k incl. cur
        Node* victim = cur->next;
        cur->next = victim->next;
        delete victim;
        cur = cur->next;                   // counting resumes after victim
    }
    return cur->val;
}
// recurrence: O(n) time, O(1) space — 1-based answer
int josephus(int n, int k) {
    int seat = 0;                          // J(1, k) = 0
    for (int size = 2; size <= n; size++)
        seat = (seat + k) % size;          // J(size) = (J(size-1)+k) mod size
    return seat + 1;
}`,
        java: `static int josephus(int n, int k) {
    int seat = 0;
    for (int size = 2; size <= n; size++)
        seat = (seat + k) % size;
    return seat + 1;
}`,
        python: `def josephus(n, k):
    seat = 0                      # J(1, k) = 0
    for size in range(2, n + 1):
        seat = (seat + k) % size
    return seat + 1               # 1-based`,
        js: `const josephus = (n, k) => {
    let seat = 0;
    for (let size = 2; size <= n; size++) seat = (seat + k) % size;
    return seat + 1;
};`,
        c: `int josephus(int n, int k) {
    int seat = 0;
    for (int size = 2; size <= n; size++)
        seat = (seat + k) % size;
    return seat + 1;
}`,
      },
      note: 'For k = 2 there is an even slicker closed form: write n = 2^m + l with 0 ≤ l < 2^m; the survivor (1-based) is 2l + 1. Deriving it from the binary representation is a lovely exercise — rotating the leading bit to the end doubles-and-adds-one, exactly what the recurrence does for k = 2.',
    },
    {
      t: 'complexity',
      rows: [
        { op: 'doubly: delete a HELD node', time: 'O(1)', space: '—', note: 'the prev pointer’s entire purpose' },
        { op: 'doubly: insert between held a and b', time: 'O(1)', space: '—', note: 'four writes' },
        { op: 'doubly: walk backward from tail', time: 'O(n)', space: '—', note: 'impossible in a singly list' },
        { op: 'circular: rotate right by k', time: 'O(n)', space: 'O(1)', note: 'ring + one cut (page 11)' },
        { op: 'Josephus by simulation', time: 'O(n·k)', space: 'O(n)', note: 'n unlinks, k hops each' },
        { op: 'Josephus by recurrence', time: 'O(n)', space: 'O(1)', note: 'or O(1) closed form for k = 2' },
      ],
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Asymmetric updates',
      md: `The #1 doubly-list bug: updating \`next\` and forgetting \`prev\` (or vice versa). The list still "works" walking forward and fails mysteriously walking backward — often many operations later. Discipline: every splice is FOUR writes for insert (n.prev, n.next, a.next, b.prev) and TWO for delete (p.next, q.prev); count them in your head as you write. The second bug: on a circular list, testing \`cur->next != nullptr\` — it never is. The stop condition must compare against head (or count nodes).`,
    },
    {
      t: 'callout',
      kind: 'interview',
      md: `**"Design an LRU cache"** (the single most asked design question) is a doubly-list problem wearing a hashmap costume: hashmap for O(1) lookup, doubly list for O(1) move-to-front and evict-from-back. We build the list half here and the full cache in the Hashing topic — but the reason the list must be DOUBLY is exactly this page: on a cache hit you hold the node and must unlink it in O(1), which a singly list cannot do. Also expect: "flatten a multilevel doubly list" (page 11) and "insert into a sorted circular doubly list" (the tricky case: where does the new maximum go? between tail and head — and when is the list one node?).`,
    },
    {
      t: 'check',
      ids: ['ll-q-doubly-writes', 'll-q-doubly-why', 'll-q-circular-walk', 'll-q-josephus-numeric', 'll-q-josephus-k2', 'll-q-doubly-circular-multi', 'll-q-doubly-lru'],
    },
  ],
}
