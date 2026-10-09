## Intuition
Both lists are already sorted, so the merged answer's next element is always the smaller of the two current heads — one comparison per output node, no searching. On a list this is *relinking*, not copying: every output node is an existing node from A or B, and appending it is one pointer write. The whole algorithm is a tail-pointer walk.

## Approach
A dummy node owns the growing result; a `tail` pointer marks its last node so appending is one write:

```cpp
Node dummy{-1, nullptr}, *tail = &dummy;
Node *a = headA, *b = headB;
while (a && b) {
    if (a->v <= b->v) { tail->next = a; a = a->next; }   // <= keeps ties stable: A first
    else              { tail->next = b; b = b->next; }
    tail = tail->next;
}
tail->next = a ? a : b;   // attach the non-empty remainder WHOLE
return dummy.next;
```

When one list empties, attach the other's remainder in a single write — it is sorted and every remaining element is ≥ the last appended one, so it needs no further merging.

## Why it works
Loop invariant: the chain behind `dummy` is sorted, and its last element is ≤ every element still in A and B. Each iteration picks the minimum of the two heads (exactly the next element of the merged sorted order), appends it, and the invariant is restored. When one head is null, the other list's remainder is sorted and entirely ≥ the last appended value, so splicing it whole finishes the merge. Termination: every iteration removes one node from A or B, so after at most $na + nb$ iterations one list is empty. The `<=` in the comparison means equal values take A's node first — the stable tie rule the statement requires.

## Complexity
$O(na + nb)$ time — at most one comparison per output node. $O(1)$ extra space — zero allocations, the result reuses the input nodes. This merge is exactly the engine that makes list merge sort possible.

## Pitfalls
- Forgetting `tail->next = a ? a : b` and returning early: the result is truncated to whichever list emptied last.
- Using `<` vs `<=` matters for *stability*, not sortedness — with equal values the wrong side comes first. The fixture expects A's element first.
- Advancing `tail` before relinking it, or relinking `tail->next` before saving `a->next` via `a = a->next`: here the save is just the pointer advance, and the order is what keeps the untouched part of the list reachable.
- Allocating new nodes and copying values: passes these tests, but the statement (and every interviewer) wants relinking — zero allocation is the point.
