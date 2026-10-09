## Intuition
The list is sorted, so equal values are **adjacent** — "have I seen this value before?" collapses from a memory problem (a hash set) into a single comparison with the next node. Keep the first occurrence: walk with `cur`, and whenever `cur->v == cur->next->v`, unlink the next node — and do **not** advance `cur`, because a run of three equal values must lose two nodes, and only the surviving comparison sees the third.

## Approach
```cpp
Node* cur = head;
while (cur && cur->next) {
    if (cur->v == cur->next->v)
        cur->next = cur->next->next;   // unlink the repeat; cur stays
    else
        cur = cur->next;               // distinct: this one is a first occurrence
}
return head;
```

The head always survives keep-one dedup — it is trivially a first occurrence — so no dummy is needed here. (Contrast: *delete all nodes that have duplicates*, where the head itself can go and a dummy becomes mandatory.)

## Why it works
Invariant: when `cur` is examined, every node up to and including `cur` is a kept first occurrence, and `cur` is the last kept node. If `cur->next` has the same value, it is a repeat of a kept node, so unlinking it is correct and `cur` must stay to re-test the *new* `cur->next` (which may be a third equal). If the values differ, `cur->next` is a first occurrence of a new value (sortedness: all its equals would be adjacent to it), so it is kept and `cur` advances. Each iteration either unlinks one node or advances `cur`, so the walk terminates; at the end every repeat has been unlinked and every first occurrence kept, in original order (unlinking never reorders).

## Complexity
$O(n)$ time — each node is unlinked or stepped over once. $O(1)$ space — no set needed, sortedness is the index.

## Pitfalls
- Advancing `cur` after an unlink: `[1,1,1]` keeps the third `1` — the classic failure. Stay put until `cur->next` differs.
- Comparing `cur->v` with the *previous* node instead of the next: you unlink `cur` itself and need a `prev` pointer and head handling for no benefit — the forward comparison is the clean form.
- Assuming this works on unsorted input: `[4,2,4]` keeps both 4s. Unsorted dedup needs a seen-set (that's ll-c-dedup-unsorted).
- Reaching for a dummy out of habit: harmless, but the head can never be a repeat of an earlier node here — keep-one always keeps position 0.
