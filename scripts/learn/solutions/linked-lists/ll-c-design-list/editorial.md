# ll-c-design-list — Design a linked list

## Intuition
Five operations, and each one has a classic failure mode this design removes: add/delete at the head needs a special case (the dummy head kills it), `addAtTail` needs an O(n) walk (the tail pointer kills it), and `get`/`delete` on garbage indexes needs bounds logic (a size counter kills it in O(1)). The design IS the lesson: dummy head + tail pointer + size counter, and every operation becomes "walk to a node, then two writes."

## Approach
State: `dummy` (a sentinel node whose `next` is the real head), `tail` (last real node, or `dummy` when empty), and `size`.

The key helper returns the node *before* position i — splices then never touch the head specially:

```cpp
Node* nodeBefore(int i) {          // node whose next is position i
    Node* cur = &dummy;
    for (int s = 0; s < i; s++) cur = cur->next;
    return cur;
}
```

Rules, implemented exactly:
- `get i`: if $0 \le i < \text{size}$ walk i+1 steps from dummy; else −1.
- `addAtHead v` / `addAtIndex i v` with $i \le 0$: insert after `dummy` — the same two lines, `nd->next = dummy.next; dummy.next = nd;`. No "is the list empty?" branch for the head itself; only the tail pointer needs the `if (size == 0) tail = nd;` fix-up.
- `addAtTail v` / `addAtIndex size v`: `tail->next = nd; tail = nd;` — two writes even on an empty list, because `tail` starts AT the dummy.
- `addAtIndex i v` with $0 < i < \text{size}$: `prev = nodeBefore(i); nd->next = prev->next; prev->next = nd;`.
- `addAtIndex i v` with $i > \text{size}$: ignored — the size check makes this O(1), no walk.
- `deleteAtIndex i`: out of range → ignored; else `prev = nodeBefore(i); prev->next = victim->next;` and if the victim was the tail, `tail = prev` (this works even when deleting the last node down to empty, because `prev` may be the dummy itself).

## Why it works
Invariant: `dummy.next` heads the live nodes, `tail` is the last one (or `dummy` if none), and `size` is their count. Because the dummy is never removed and every real node has a real predecessor node, the splice `prev->next = ...` is uniform — the head is just "position 0, whose predecessor is the dummy." The tail pointer is valid by construction: it only moves when we append (to the new node) or delete it (to its predecessor, possibly the dummy). Index validity is exactly `0 <= i < size` for reads/deletes, and `i <= size` for inserts, all O(1) checks against the counter.

## Complexity
$O(1)$ for `addAtHead`, `addAtTail`, and all rejected-index cases. $O(\min(i, n))$ for `get`, interior `addAtIndex`, and `deleteAtIndex` — a singly list cannot index better than a walk from the head. With q ≤ 2000 that is trivially fast; the honest interview note is that this design trades index speed for O(1) end-splices, and if you needed fast indexed access you would keep a doubly list with a tail, a skip list, or an array.

## Pitfalls
- Returning or storing the real head separately: after `addAtHead` your saved head is stale. Always read the head as `dummy.next`.
- Forgetting `if (size == 0) tail = nd;` on front-inserts into an empty list: the tail silently stays at the dummy and the next `addAtTail` overwrites `dummy.next`, losing nodes.
- Letting `tail` dangle after `deleteAtIndex` removes the last node: the victim == tail case must move tail back to its predecessor.
- Treating `addAtIndex` with negative i as invalid: the standard rule is i ≤ 0 inserts at the FRONT, and `deleteAtIndex`/`get` with negative i return/ignore. Mixing these up fails the edge tests.
- Walking i steps instead of i+1 for `get` (you start at the dummy, which is position −1) or i steps to position i (correct only because you stop AT the predecessor). Off-by-one is the whole game here.
- Not maintaining `size` in every successful mutation branch: the O(1) validity checks quietly become wrong.
