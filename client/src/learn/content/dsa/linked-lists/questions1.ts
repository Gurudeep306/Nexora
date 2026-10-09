import type { Question } from '../../../questions/types'

const T = 'linked-lists'

export const questions1: Question[] = [
  // ── Why linked lists
  {
    id: 'll-q-mem-why', topic: T, page: 'why-linked-lists', kind: 'mcq', difficulty: 'easy',
    title: 'What the pointer buys',
    prompt: 'A singly linked list beats an array for which operation?',
    options: [
      'Reading element 5,000,000 of a 10-million-element sequence',
      'Inserting at the front of a full 10-million-element sequence',
      'Summing all elements',
      'Binary-searching a sorted sequence',
    ],
    answer: 1,
    explain: 'Inserting at the front of a list is two writes (n.next ← head, head ← n) regardless of length; the same insert on a full array must shift all 10,000,000 elements AND may first reallocate the whole block (another full copy). Index access is the array’s strength (base + i·size, one arithmetic step) versus the list’s 5,000,000 pointer hops. Summing and searching touch every element in both, and the array wins both on cache locality — plus binary search needs index jumps a list cannot make.',
  },
  {
    id: 'll-q-mem-cost', topic: T, page: 'why-linked-lists', kind: 'numeric', difficulty: 'easy',
    title: 'Count the hops',
    prompt: 'Following `next` from the head of a 1000-node list, how many pointer dereferences does it take to REACH the node at index 500 (0-based)?',
    answer: 500,
    hint: 'The head is index 0 and you already hold it; each dereference advances one node.',
    explain: 'You start holding the head (index 0) without any dereference; reaching index i costs exactly i dereferences, so index 500 costs 500. An array reaches the same index with one address computation. This linear gap — O(1) vs O(i) — is the price the list pays for its scattered nodes, and it is why algorithms like fast/slow pointers exist: they extract positions from RELATIONSHIPS between walkers instead of indexes.',
  },
  {
    id: 'll-q-mem-cache', topic: T, page: 'why-linked-lists', kind: 'multi', difficulty: 'medium',
    title: 'Why arrays usually win the benchmarks',
    prompt: 'Select every reason a plain array typically outperforms a linked list for whole-sequence work (sums, searches, scans), even at equal big-O.',
    options: [
      'Contiguous elements fit on few cache lines; the hardware prefetcher streams the next ones for free.',
      'A list node costs value + pointer (+ allocator overhead), so the same data occupies more cache.',
      'List nodes are scattered, so each hop is likely a cache miss (~100 cycles).',
      'Arrays have O(1) insertion, so scans never invalidate anything.',
      'Following a pointer depends on the previous load’s result, so the misses cannot overlap.',
    ],
    answers: [0, 1, 2, 4],
    explain: 'Locality is the whole story: contiguity (few lines, prefetchable), density (no per-element pointer tax), and the serial dependency of pointer chasing — you cannot fetch node i+1 until you have loaded node i, so misses pipeline badly. Option 4 is false: array insertion is O(n) (shifts), not O(1), and has nothing to do with scan speed. These constant factors are exactly why "prefer arrays by default; use links when the O(1) splice is the requirement" is the professional default — Sedgewick’s measurements and Stroustrup’s talk both hammer this point.',
  },
  {
    id: 'll-q-mem-valid', topic: T, page: 'why-linked-lists', kind: 'mcq', difficulty: 'medium',
    title: 'Stable addresses',
    prompt: 'An editor holds millions of cursor/bookmark references INTO a document buffer. Which property makes a node-based buffer safer than an array here?',
    options: [
      'Nodes are cheaper to allocate than array slots',
      'Nodes never move when other nodes are inserted or deleted, so held pointers stay valid',
      'Lists support O(1) index access, so cursors move faster',
      'Arrays cannot store text',
    ],
    answer: 1,
    explain: 'This is the STABLE ADDRESSES property: inserting or deleting elsewhere in a list rewires pointers around the change but never relocates surviving nodes — every bookmark keeps pointing at its node. In an array, inserting shifts every later element (all indexes after the insert change meaning) and growing reallocates the whole block (every held pointer/reference dangles). Editors, kernel data structures and intrusive containers exploit exactly this. The cost side: reaching a bookmark by position is still O(n) in a list.',
  },
  {
    id: 'll-q-mem-splice', topic: T, page: 'why-linked-lists', kind: 'mcq', difficulty: 'easy',
    title: 'The list’s signature move',
    prompt: 'You hold a pointer p to a node and want to insert a new node immediately after it. What does the insert cost on a singly linked list, and how many pointer writes?',
    options: [
      'O(n) — you must walk to the end first',
      'O(1) — exactly 2 writes: n.next ← p.next, then p.next ← n',
      'O(1) — exactly 1 write: p.next ← n',
      'O(n) — nodes after p must shift right',
    ],
    answer: 1,
    explain: 'Given the splice point, the insert is O(1): allocate n, write n.next ← p.next (the new node learns the future FIRST), then p.next ← n. Two writes — and their order is the read-before-write rule: reversing them makes p’s old successor unreachable before n learns its address. One write alone loses the rest of the list; no walking and no shifting is needed because the list stores adjacency, not positions. An array pays O(n) here no matter what you hold: the shift is unavoidable.',
  },
  {
    id: 'll-q-mem-node-bytes', topic: T, page: 'why-linked-lists', kind: 'numeric', difficulty: 'easy',
    title: 'The pointer tax',
    prompt: 'On a 64-bit machine, a minimal list node is `struct { int32 val; Node* next; }` with the fields packed as tightly as alignment allows. How many bytes does ONE node occupy (value + pointer + padding)?',
    answer: 16,
    hint: 'The pointer field must sit at an 8-byte-aligned offset.',
    explain: 'The pointer needs 8 bytes and 8-byte alignment, the int needs 4 — packed tightly that is 4 (val) + 4 (padding) + 8 (next) = 16 bytes per node, versus 4 bytes per element in an int array: a 4× density loss (and real allocators add per-allocation headers on top). This is the memory row of the arrays-vs-lists table made concrete: for small payloads the LINK costs more than the DATA. (Reordering to `{ Node* next; int32 val; }` doesn’t help either — the struct still rounds up to 16 for array alignment.)',
  },
  {
    id: 'll-q-mem-match', topic: T, page: 'why-linked-lists', kind: 'match', difficulty: 'medium',
    title: 'Which structure wins each job?',
    prompt: 'Match each workload with its true cost profile (singly list WITHOUT a tail pointer vs a dynamic array, both holding n elements).',
    left: [
      'Insert at the front, repeatedly',
      'Append at the back, repeatedly',
      'Read index n/2, repeatedly',
      'Splice at a node you already hold',
      'Sum all elements, once',
    ],
    right: [
      'two pointer writes per insert, regardless of n',
      'amortized O(1) into spare capacity — but the other structure walks n nodes per append',
      'base + i·size: one arithmetic step, no walking',
      'O(1): the neighbours are rewired, nothing shifts',
      'contiguous scan with hardware prefetch — wins on cache',
    ],
    explain: 'Front inserts: the list pays 2 writes, the array shifts n (and reallocates when full). Back appends: the array is amortized O(1) into spare capacity while a singly list without a tail pointer walks n nodes per append (Θ(n²) total) — with a tail pointer the list ties at O(1), which is why real queues keep one. Index reads and full scans are pure array wins: arithmetic vs hops, and cache prefetching. Held-node splices are the list’s signature O(1) — the array cannot avoid shifting.',
  },

  // ── Singly linked lists
  {
    id: 'll-q-singly-order', topic: T, page: 'singly-linked', kind: 'order', difficulty: 'medium',
    title: 'insertAfter in the only safe order',
    prompt: 'Put the steps of `insertAfter(p, x)` in the order that never loses nodes.',
    items: [
      'n ← new Node(x)',
      'n.next ← p.next',
      'p.next ← n',
    ],
    explain: 'Allocate, then the new node READS p.next (step 2), and only then may p.next be overwritten (step 3). Swapping steps 2 and 3 is the classic truncation bug: p.next ← n destroys the only pointer from the front of the list into the tail before n ever learns that address — the tail becomes unreachable (a leak in C, garbage elsewhere). The general rule: every node must learn its future before any existing pointer that encodes that future is overwritten.',
  },
  {
    id: 'll-q-singly-pushback', topic: T, page: 'singly-linked', kind: 'numeric', difficulty: 'easy',
    title: 'pushBack without a tail pointer',
    prompt: 'A singly list of 64 nodes has no tail pointer. How many nodes does one pushBack visit during its walk to the tail?',
    answer: 64,
    hint: 'The walk starts at the head and follows next until it finds next = null.',
    explain: 'The walk visits every node — 64 — because "the tail" is defined as "the node whose next is null" and nothing remembers where that is. So pushBack is O(n) per call, and building an n-node list this way costs Σᵢ₌₁ⁿ (i−1) = n(n−1)/2 hops: Θ(n²). Keeping a tail pointer alongside head makes pushBack exactly 2 writes, O(1) — the fix every real queue implementation uses (and the bridge to the Queues topic).',
  },
  {
    id: 'll-q-singly-byvalue', topic: T, page: 'singly-linked', kind: 'mcq', difficulty: 'medium',
    title: 'Why the insert "did nothing"',
    prompt: 'In Java: `void pushFront(ListNode head, int x) { ListNode n = new ListNode(x); n.next = head; head = n; }`. Calling it leaves the caller’s list unchanged. Why?',
    options: [
      'Java forbids reassigning parameters',
      'The parameter `head` is a copy of the caller’s reference; reassigning it changes only the copy',
      'The garbage collector frees n immediately',
      'n.next = head creates a cycle',
    ],
    answer: 1,
    explain: 'Java (like Python and JS) passes references BY VALUE: the method gets a copy of the head reference, so `head = n` rebinds the copy and the caller still points at the old head. Fixes: return the new head and rebind at the call site (`head = pushFront(head, x)`), or mutate a holder object/field that both sides share. C++ has the third option: `void pushFront(ListNode*& head, int x)` — a reference to the caller’s pointer, so the assignment lands. This is the #1 "my list function silently did nothing" bug, and interviewers plant it deliberately.',
  },
  {
    id: 'll-q-singly-fill', topic: T, page: 'singly-linked', kind: 'fill', difficulty: 'easy',
    title: 'The traversal loop',
    prompt: 'Complete the traversal that visits every node exactly once and terminates on both empty and non-empty lists.',
    lang: 'cpp',
    code: `
int count(ListNode* head) {
    int n = 0;
    for (ListNode* cur = [[0]]; cur != [[1]]; cur = [[2]])
        n++;
    return n;
}`,
    blanks: [['head'], ['nullptr', 'null', 'NULL', '0'], ['cur->next', 'cur -> next']],
    explain: 'cur starts at head (so the empty list — head = nullptr — skips the loop and returns 0 correctly), the guard tests against null (the list’s only end marker), and the advance follows next. Any other combination breaks a case: starting at head->next skips the first node (and dereferences null on the empty list); testing `cur->next != nullptr` stops one node early and counts the tail as unvisited.',
  },
  {
    id: 'll-q-singly-ops', topic: T, page: 'singly-linked', kind: 'array', difficulty: 'medium',
    title: 'A sequence of operations',
    prompt: 'Start with an empty list. Apply: pushFront(1), pushFront(2), pushBack(3), insertAfter(node with value 1, 4), deleteAfter(node with value 2). List the final values head→tail.',
    answer: [2, 4, 3],
    placeholder: 'e.g. 1, 2, 3',
    hint: 'pushFront reverses arrival order; draw the arrows after each step.',
    explain: 'pushFront(1) → [1]. pushFront(2) → [2,1]. pushBack(3) → [2,1,3]. insertAfter(1, 4): node 1’s next was 3, so the 4 splices between them → [2,1,4,3]. deleteAfter(2) removes the node AFTER 2 — that is node 1 — leaving [2,4,3]. Each step is one or two pointer writes; the discipline is drawing the arrows after every operation, because "deleteAfter(2)" tempting you to delete the 2 itself is exactly the kind of misread these operations invite.',
  },
  {
    id: 'll-q-singly-order-steps', topic: T, page: 'singly-linked', kind: 'order', difficulty: 'easy',
    title: 'pushFront step by step',
    prompt: 'Order the pushFront steps.',
    items: [
      'Allocate node n with the new value',
      'n.next ← head (n learns the old head)',
      'head ← n (head moves to the new node)',
    ],
    explain: 'Allocate → link new to old → move head. The last two steps cannot swap: if head moves first you no longer hold the old head anywhere except inside n… which you haven’t written yet, so the old list is lost. Notice the same read-before-write shape as insertAfter: the newcomer learns the existing structure BEFORE the structure’s entry pointer moves.',
  },
  {
    id: 'll-q-singly-build-quad', topic: T, page: 'singly-linked', kind: 'numeric', difficulty: 'medium',
    title: 'The quadratic build, counted',
    prompt: 'You build a 100-node list by pushBack WITHOUT a tail pointer (the i-th pushBack walks the i−1 existing nodes). How many node visits do all 100 walks perform in total?',
    answer: 4950,
    hint: 'Σᵢ₌₁¹⁰⁰ (i − 1) = 0 + 1 + 2 + … + 99.',
    explain: '0 + 1 + … + 99 = 99·100/2 = 4950 — Θ(n²) for a job that is Θ(n) with a tail pointer (2 writes per push). This sum is the concrete meaning of "quadratic by accident": nothing in each individual pushBack LOOKS expensive, and the bug only shows at scale (100 nodes: 4950 visits, tolerable; 1,000,000: ~5·10¹¹ visits, a hang). Interviewers ask "what is the complexity of your buildList?" precisely to see if you sum the walks.',
  },
  {
    id: 'll-q-singly-tail-o1', topic: T, page: 'singly-linked', kind: 'mcq', difficulty: 'easy',
    title: 'Making pushBack O(1)',
    prompt: 'What is the minimal change that makes pushBack O(1) on a singly linked list?',
    options: [
      'Store the length in a field',
      'Keep a second head-side pointer, `tail`, updated on every operation that changes the end',
      'Make the list circular',
      'Sort the list',
    ],
    answer: 1,
    explain: 'A tail pointer removes the walk entirely: pushBack becomes tail.next ← n; tail ← n (two writes). The bookkeeping obligation is the price: insert/delete operations that remove or add at the END must also move tail (deleting the tail node is the awkward one — you need its predecessor, so singly lists usually forbid O(1) tail deletion; doubly lists don’t, page 4). Length doesn’t help find the tail; circularity changes the shape but the walk to "the node before head" is still O(n); sorting is irrelevant. This head+tail pair IS a queue — the Queues topic builds exactly this.',
  },

  // ── The dummy head
  {
    id: 'll-q-dummy-why', topic: T, page: 'dummy-head', kind: 'mcq', difficulty: 'easy',
    title: 'One awkwardness, removed',
    prompt: 'The dummy (sentinel) head exists to eliminate which special case?',
    options: [
      'The empty list',
      'The node that has no node before it (the head) when prev-based code must fix "the previous node’s next"',
      'Lists with duplicate values',
      'Null value fields',
    ],
    answer: 1,
    explain: 'Prev-based algorithms delete/insert by rewriting prev->next — but the head has no predecessor, so every such algorithm needs a separate "what if it’s the head?" branch. A dummy node standing before the head gives EVERY real node a predecessor, and the branch disappears: the head case becomes "prev is the dummy". The empty list is still a (trivial) case — dummy.next = null and the loop simply never runs — but it no longer needs its own code.',
  },
  {
    id: 'll-q-dummy-return', topic: T, page: 'dummy-head', kind: 'mcq', difficulty: 'easy',
    title: 'What comes back',
    prompt: 'A sentinel-anchored `removeAll(head, x)` finishes. What must it return?',
    options: ['dummy', 'dummy.next', 'head', 'prev'],
    answer: 1,
    explain: 'dummy.next — which is the surviving head, correctly null if every node was deleted and correctly the second node if the original head was deleted. Returning `head` is the classic wrong-answer-on-every-test bug: head may itself have been unlinked, so the caller gets a chain starting at a deleted node (or the old head that is no longer first). Returning `dummy` exposes the scaffolding — callers see a ghost leading 0. `prev` is wherever the walk ended, unrelated to the answer.',
  },
  {
    id: 'll-q-dummy-consecutive', topic: T, page: 'dummy-head', kind: 'array', difficulty: 'medium',
    title: 'Consecutive deletions',
    prompt: 'run removeAll(head, 2) on the list [2, 2, 2, 5, 2, 7] with the dummy-head algorithm (prev does NOT advance after an unlink). List the surviving values head→tail.',
    answer: [5, 7],
    placeholder: 'e.g. 5, 7',
    hint: 'After each unlink prev stays put and re-examines the NEW prev.next.',
    explain: 'dummy→2→2→2→5→2→7. prev starts at dummy: the three leading 2s are each unlinked with prev staying at the dummy (each new prev.next is re-examined — advancing prev here would skip the second and third 2, the classic "only the first of a run goes" bug). Then 5 survives (prev advances onto it), the next 2 is unlinked (prev stays at 5, re-examines 7), 7 survives. Result [5,7] — and note the original head was deleted, which is exactly why the answer is dummy.next, not head.',
  },
  {
    id: 'll-q-dummy-fill', topic: T, page: 'dummy-head', kind: 'fill', difficulty: 'easy',
    title: 'The removeAll loop',
    prompt: 'Complete the sentinel-anchored deletion loop.',
    lang: 'cpp',
    code: `
ListNode* removeAll(ListNode* head, int x) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* prev = &dummy;
    while ([[0]]) {
        if (prev->next->val == x)
            [[1]];              // unlink; prev does NOT move
        else
            prev = prev->next;
    }
    return [[2]];
}`,
    blanks: [
      ['prev->next', 'prev->next != nullptr', 'prev->next != NULL', 'prev -> next'],
      ['prev->next = prev->next->next', 'prev->next=prev->next->next'],
      ['dummy.next'],
    ],
    explain: 'The loop tests prev->next (the candidate), because prev must always be the node BEFORE the one under inspection. The unlink is one assignment that jumps over the candidate; prev staying put is what makes consecutive duplicates work. The return is dummy.next — never head (possibly deleted), never dummy (scaffolding). The stack-allocated dummy dies with the frame and takes every dangling pointer to itself with it — no delete, no leak.',
  },
  {
    id: 'll-q-dummy-multi', topic: T, page: 'dummy-head', kind: 'multi', difficulty: 'medium',
    title: 'Dummy-head discipline',
    prompt: 'Select every TRUE statement about sentinel-anchored list code.',
    options: [
      'After unlinking a candidate, prev must NOT advance — the new prev.next has never been examined.',
      'In C++, a stack-allocated `ListNode dummy(0)` is preferred over `new ListNode(0)`: no delete needed, no leak on early return.',
      'The dummy may be returned if the list turns out to be empty.',
      'With a dummy, "delete the head" and "delete a middle node" are the same code.',
      'The dummy must be freed in C even when it was stack-allocated.',
    ],
    answers: [0, 1, 3],
    explain: 'Staying put after an unlink keeps the invariant "everything up to prev is clean AND prev.next is unchecked" — advancing skips consecutive duplicates. Stack sentinels remove the whole free-the-dummy failure mode. With a dummy every real node has a predecessor, so one loop covers head and middle deletions identically. The dummy is NEVER returned (it is scaffolding with a fake value), and freeing a stack object is undefined behaviour — its lifetime ends with the frame.',
  },
  {
    id: 'll-q-dummy-sorted-numeric', topic: T, page: 'dummy-head', kind: 'numeric', difficulty: 'medium',
    title: 'How far does sorted insert walk?',
    prompt: 'sortedInsert(head, 4) runs on the sorted list [1, 2, 3, 5, 8, 13] using the loop `while (prev->next && prev->next->val < x) prev = prev->next;` with prev starting at a −∞ dummy. How many times does the condition evaluate to TRUE?',
    answer: 3,
    hint: 'The walk stops at the first node that is NOT < x.',
    explain: 'prev.next takes values 1, 2, 3 — each < 4, so three TRUE evaluations and prev lands on node 3. The fourth evaluation sees 5, which is not < 4, and stops: x is spliced between 3 and 5, keeping the list sorted with ties going after equals (stable). Best case (x smaller than everything) is zero TRUE evaluations — O(1); worst case (x the new maximum) walks all n. The early stop is the sorted list’s only search advantage; it still cannot binary search, because reaching the middle is O(n).',
  },
  {
    id: 'll-q-dummy-leak', topic: T, page: 'dummy-head', kind: 'mcq', difficulty: 'medium',
    title: 'The sentinel that leaks',
    prompt: 'In C++, `removeAll` starts with `ListNode* dummy = new ListNode(0);` and has an early `return nullptr;` on one error path. What is wrong?',
    options: [
      'Nothing — the garbage collector reclaims the dummy',
      'The early return skips `delete dummy`, leaking it on every error call; a stack `ListNode dummy(0);` would die with the frame instead',
      'new ListNode(0) is invalid C++',
      'The dummy must be heap-allocated for the algorithm to work',
    ],
    answer: 1,
    explain: 'C++ has no GC: every `new` needs a matching `delete` on EVERY path, and early returns are exactly where matching deletes get forgotten. The stack sentinel (`ListNode dummy(0); ListNode* prev = &dummy;`) has automatic lifetime — it is destroyed when the frame ends no matter which return was taken, and taking its address is perfectly legal within the call. Pointers to it must not escape the function (they would dangle), but nothing in these algorithms returns one: the answer is always dummy.next, a real node. Same reasoning makes C use `struct Node dummy = {0, NULL};`.',
  },

  // ── Doubly & circular lists
  {
    id: 'll-q-doubly-writes', topic: T, page: 'doubly-circular', kind: 'numeric', difficulty: 'easy',
    title: 'Count the writes',
    prompt: 'Inserting a new node n strictly between two held nodes a and b (b ≠ null) of a DOUBLY linked list requires how many pointer assignments (count n.prev, n.next, a.next, b.prev as one each)?',
    answer: 4,
    hint: 'The new node learns both neighbours; then each neighbour learns the new node.',
    explain: 'Four: n.prev ← a, n.next ← b (the newcomer learns its future first), then a.next ← n and b.prev ← n (both chains heal). A singly list needs only 2 (n.next ← p.next, p.next ← n) — the prev pointer doubles the surgery, and forgetting any one of the four leaves prev and next disagreeing: the list works walking forward and fails mysteriously walking backward, often many operations later. Deletion is the mirror image: exactly 2 writes (p.next ← q, q.prev ← p).',
  },
  {
    id: 'll-q-doubly-why', topic: T, page: 'doubly-circular', kind: 'mcq', difficulty: 'easy',
    title: 'What prev buys',
    prompt: 'You hold a pointer d to a node deep inside a list and must delete THAT node in O(1). Which list supports this, and why?',
    options: [
      'Singly — one write: d.next ← d.next.next',
      'Doubly — d.prev and d.next let both neighbours be rewired without any walk',
      'Singly — deletion is always O(1) on lists',
      'Neither — deletion needs the head pointer',
    ],
    answer: 1,
    explain: 'Deleting a held node means making its PREDECESSOR skip it — and a singly list cannot find the predecessor without an O(n) walk from the head (d.prev simply doesn’t exist). A doubly list rewires both neighbours in two writes: d.prev.next ← d.next and d.next.prev ← d.prev (with the head/tail null cases). Option 1’s code corrupts: it makes d skip its own successor instead of removing d. This O(1) held-node deletion is the entire reason LRU caches, editor buffers and standard-library deques use doubly lists.',
  },
  {
    id: 'll-q-circular-walk', topic: T, page: 'doubly-circular', kind: 'mcq', difficulty: 'medium',
    title: 'Where null never comes',
    prompt: 'Which is a correct traversal of a circular singly linked list starting at head?',
    options: [
      'for (Node* c = head; c != nullptr; c = c->next) visit(c);',
      'Node* c = head; do { visit(c); c = c->next; } while (c != head);',
      'for (Node* c = head; c->next != head; c = c->next) visit(c);',
      'Both B and C visit every node exactly once',
    ],
    answer: 1,
    explain: 'A circular list has no null anywhere, so option A spins forever. The do-while (B) visits head first, then stops when the walk returns to head — every node exactly once, and it works on the one-node ring too. Option C visits every node EXCEPT the last one: the guard fails when c is the tail (whose next is head), so the tail is never visited — a silent off-by-one. The general rule: on rings, the stop condition is IDENTITY against a remembered start node (or a count), never a null test. And a `while (c)` loop on a CORRUPTED (accidentally cyclic) list is exactly the hang Floyd’s algorithm exists to detect.',
  },
  {
    id: 'll-q-josephus-numeric', topic: T, page: 'doubly-circular', kind: 'numeric', difficulty: 'medium',
    title: 'Josephus J(7, 3)',
    prompt: 'Seven people numbered 1–7 stand in a ring; every 3rd person (counting from 1, and continuing after each elimination) is eliminated. What is the survivor’s number?',
    answer: 4,
    hint: 'Simulate on the ring, or iterate the recurrence seat ← (seat + 3) mod size for size = 2 … 7 starting from seat = 0, then add 1.',
    explain: 'Simulation: eliminate 3, then 6, then 2, then 7, then 5, then 1 — survivor 4. Recurrence check: seat = 0; sizes 2…7 give (0+3)%2=1, (1+3)%3=1, (1+3)%4=0, (0+3)%5=3, (3+3)%6=0, (0+3)%7=3; 3 + 1 = 4. ✓ The list simulation costs O(n·k) pointer hops (n unlinks, k−1 hops each); the recurrence is O(n) time and O(1) space with no structure at all — the answer to "can you do better?" is usually yes, and naming the recurrence is the differentiator.',
  },
  {
    id: 'll-q-josephus-k2', topic: T, page: 'doubly-circular', kind: 'numeric', difficulty: 'medium',
    title: 'Josephus with k = 2',
    prompt: 'For k = 2 there is a closed form: write n = 2^m + l with 0 ≤ l < 2^m; the survivor (1-based) is 2l + 1. Ten people, every 2nd eliminated — what is the survivor’s number?',
    answer: 5,
    hint: '10 = 8 + 2, so m = 3 and l = 2.',
    explain: '10 = 2³ + 2, so l = 2 and the survivor is 2·2 + 1 = 5. Equivalently in binary: rotate 10 = 1010₂ left by one bit → 0101₂ = 5 — the recurrence for k = 2 is exactly "double and wrap", which is a bit rotation. Sanity check with the recurrence: seats 0,0,2,0,2,4,6,0,2,4 for sizes 1…10 → 4 + 1 = 5. ✓ Powers of two are the elegant edge: n = 2^m gives l = 0, survivor 1 — person 1 always wins when the ring size is a power of two.',
  },
  {
    id: 'll-q-doubly-circular-multi', topic: T, page: 'doubly-circular', kind: 'multi', difficulty: 'medium',
    title: 'Doubly and circular facts',
    prompt: 'Select every TRUE statement.',
    options: [
      'A doubly linked list is correct only if u.next = v ⟺ v.prev = u holds at every moment.',
      'On a circular list, "empty" can be expressed as head.next == head (a one-node sentinel ring).',
      'A doubly linked list uses less memory per node than a singly one.',
      'Rotating a circular list right by k needs zero node movement: close-or-already-closed ring, walk, one cut.',
      'Deleting the TAIL of a singly list (no tail pointer) is O(1) if you hold the tail node itself.',
    ],
    answers: [0, 1, 3],
    explain: 'The prev/next agreement is the doubly list’s defining invariant — half-updated links are its signature disease. Circular sentinels make "empty" a self-loop, removing null cases entirely. Rotation is pure pointer work: the nodes never move in memory (page 11 animates ring → walk → cut). False: a doubly node carries an EXTRA pointer (more memory, ~50% more link traffic per splice). And singly tail deletion is O(n) EVEN holding the tail — removing it requires its predecessor’s next to change, and the predecessor is only reachable by walking from the head. Doubly lists delete any held node, tail included, in O(1).',
  },
  {
    id: 'll-q-doubly-lru', topic: T, page: 'doubly-circular', kind: 'mcq', difficulty: 'medium',
    title: 'Why the LRU cache is doubly',
    prompt: 'An LRU cache stores entries in a list by recency plus a hashmap key→node. On a cache HIT the entry must move to the front. Why must the list be DOUBLY linked?',
    options: [
      'Doubly lists are faster to traverse',
      'The hit gives you the NODE (from the map); unlinking a held node needs its predecessor, which only prev provides — O(1) instead of an O(n) walk',
      'Singly lists cannot store hashmap entries',
      'The doubly list halves the memory of the cache',
    ],
    answer: 1,
    explain: 'The hashmap hands you the exact node — but "move to front" = unlink + push front, and unlinking needs the predecessor. In a singly list the predecessor is only findable by walking from the head: O(n) per hit, destroying the cache’s purpose. The prev pointer makes it two writes. This is the canonical answer to "why doubly?" in every design interview (LFU, browser history, playlists, kernel run queues all share it) — and the full LRU build (map + list, O(1) everything) happens in the Hashing topic using exactly this page’s erase/insertBetween.',
  },
]
