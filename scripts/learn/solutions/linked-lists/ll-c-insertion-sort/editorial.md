## Intuition
Insertion sort grows a sorted prefix and inserts each new element into its slot. On an array that slot-finding costs element *shifts*; on a list the insert is two pointer writes regardless of how big the payload is — that's the classic argument for insertion sort on lists. Keep the sorted result behind a **dummy** (so "insert before the first node" needs no special case), repeatedly detach the input's head, scan for the slot, and splice.

## Approach
```cpp
Node dummy{-1, nullptr};       // dummy->next heads the sorted result
Node* cur = head;
while (cur) {
    Node* nxt = cur->next;     // save: cur is about to leave the input chain
    Node* p = &dummy;
    while (p->next && p->next->v < cur->v)   // strict < => stable: ties go AFTER equals
        p = p->next;
    cur->next = p->next;       // splice: two writes
    p->next = cur;
    cur = nxt;
}
return dummy.next;
```

The scan stops at the last node `p` with `p->v < cur->v` (or at the dummy, or at the tail of the result), so `cur` lands exactly between `p` and the first node ≥ it.

## Why it works
Loop invariant: the chain behind `dummy` is sorted, and `cur` heads the untouched input suffix. Each round detaches exactly one node from the suffix and inserts it at the unique position that keeps the result sorted — strict `<` places it after all existing equals, preserving arrival order (stability). After $n$ rounds the suffix is empty and the result contains all $n$ nodes sorted. Termination is obvious: one node migrates per outer iteration; the inner scan always stops because the result chain is finite (and `p->next` null-checks first).

## Complexity
$O(n^2)$ worst case (reverse-sorted input makes every scan walk the whole prefix: $\sum_{i=1}^{n} i = n(n+1)/2$ comparisons — about 12.5M at $n = 5000$, still well under a second in every language). $O(n)$ on nearly-sorted input — the scan ends after a step or two — which is why every hybrid sort (Timsort, introsort) falls back to insertion sort for small runs. $O(1)$ space, stable, zero allocations.

## Pitfalls
- Not saving `nxt` before splicing: `cur->next = p->next` overwrites the only link back to the rest of the input; the loop loses the suffix.
- Scanning with `<=` instead of `<`: still sorts, but equal values end up in reverse arrival order — the sort becomes unstable.
- Inserting without the dummy: "new node is the new minimum" needs `head = cur` as a separate case; the dummy absorbs it.
- Scanning `p` itself instead of `p->next` (`while (p && p->v < cur->v)`): you stop one node too late and splice *after* the first larger element.
- Recursion instead of the loop here is pointless and blows the stack at $n = 5000$.
