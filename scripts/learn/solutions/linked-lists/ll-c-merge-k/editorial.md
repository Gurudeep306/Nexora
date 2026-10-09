## Intuition
With K sorted lists, the merged output's next element is the minimum of the K current heads. Scanning all K heads per output node is $O(NK)$. Put the K heads in a **min-heap** instead: pop-min is $O(\log K)$, and each node is popped once and pushed once — $O(N \log K)$ total. This is external sorting's engine: merging runs too big for memory, K tape heads at a time.

## Approach
Build a min-heap of the (at most K) non-empty list heads. Repeat: pop the smallest head, append it to the result (dummy + tail, as always), and push that node's successor if it exists. When the heap empties, every list has been consumed.

```cpp
auto cmp = [](Node* x, Node* y) { return x->v > y->v; };   // min-heap
priority_queue<Node*, vector<Node*>, decltype(cmp)> pq(cmp);
for (each list head h) if (h) pq.push(h);

Node dummy{0, nullptr}, *tail = &dummy;
while (!pq.empty()) {
    Node* m = pq.top(); pq.pop();
    tail->next = m;            // relink, no copying
    tail = m;
    if (m->next) pq.push(m->next);
}
```

The equally valid $O(N \log K)$ alternative is **divide & conquer pairwise merging**: merge list 0 with 1, 2 with 3, ... then merge the pairs, $\log K$ rounds — each round touches every node once. What is *not* acceptable on big inputs is sequential merging (1 into 2 into 3 ...): the running result gets re-merged every time, $O(NK)$ — with K = 100 that is 100× the work.

## Why it works
Heap invariant: the heap contains exactly the current heads of the non-empty lists, so its minimum is the global minimum of all unconsumed elements — which is precisely the next element of the merged sorted order. Popping it appends that minimum; pushing its successor restores the invariant (each sorted list contributes its smallest remaining element). Induction over the $N$ pops: the output is the elements in non-decreasing order. Each node enters the heap once (as a successor of the previously popped node, or as an initial head) and leaves once, so the work is $N$ heap ops on a heap of size $\le K$.

## Complexity
$O(N \log K)$ time for $N = \sum n_i$ nodes — with $K \le 100$, $\log K \le 7$ comparisons per node. $O(K)$ space for the heap (pointers only; the nodes themselves are relinked, not copied). Divide & conquer gives the same bound with $O(\log K)$ stack instead of a heap.

## Pitfalls
- Sequential pairwise merging: asymptotically $O(NK)$; it passes tiny tests and dies on the large one. Name the heap or D&C.
- Pushing the *popped node's list* rather than its *successor* — infinite loop.
- Empty lists: never push a null head; guard `if (h)` on init and `if (m->next)` on refill. With all lists empty the heap starts empty — print `EMPTY`.
- In C++, `priority_queue` is a MAX-heap by default; the comparator must be `x->v > y->v` (or use `greater`). Java's `PriorityQueue` and Python's `heapq` are min-heaps by default — don't double-negate.
- Forgetting the tail seal is not an issue here (every popped node's `next` is either overwritten later or is null when the list ends), but if you merge by concatenation elsewhere, seal.
