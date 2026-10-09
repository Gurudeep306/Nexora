# ll-c-remove-dups-II — Delete every value that repeats

## Intuition
Contrast with keep-one dedup: there, seeing `2→2→2` you keep the first and unlink the rest. Here the whole run dies — `[1,2,2,3,3,4]` becomes `[1,4]`, and `[1,1,1,2,3]` becomes `[2,3]`. Two consequences drive the design. First, the **head itself can be a victim** (possibly a whole run of head-victims), so a dummy head is mandatory, not a nicety. Second, when you detect a duplicate you must unlink a whole **RUN**, not one node — and remember the run's value, because the run may be longer than the two nodes you compared.

## Approach
`prev` marks the boundary: everything up to and including `prev` is confirmed unique and kept. We look ahead two nodes:

```cpp
Node* prev = &dummy;
while (prev->next && prev->next->next) {
    if (prev->next->v == prev->next->next->v) {
        int dup = prev->next->v;                 // remember the run's value
        while (prev->next && prev->next->v == dup) {
            Node* victim = prev->next;           // unlink the WHOLE run
            prev->next = victim->next;
            delete victim;
        }
        // prev stays put: the new prev->next is unexamined
    } else {
        prev = prev->next;                       // unique so far, keep it
    }
}
return dummy.next;
```

The detection uses a **two-node lookahead** (`prev->next` vs `prev->next->next`): a node is a duplicate iff it equals its successor — the list is sorted, so equal values are adjacent. When the lookahead fires, `dup` is captured and the inner loop sweeps every node with that value out, however long the run. Then — crucially — `prev` does not advance: the node now sitting at `prev->next` has never been examined and may start a new run.

The outer loop's guard needs BOTH `prev->next` and `prev->next->next`: with only one node left after `prev`, it has no successor to compare against, so it is provably unique — keep it by advancing (or just stop; advancing ends the loop anyway).

## Why it works
Invariant: every node from `dummy` through `prev` is kept, and each kept node's value differs from both its neighbors in the final list. The two-node lookahead is sound because sortedness makes "value appears more than once" ⟺ "equals its successor" for some placement in the list — and the inner sweep removes *all* occurrences of `dup` in one go (sortedness again: they are contiguous). A node is advanced past only when it differs from its successor; at that moment its successor is either null (tail, unique) or a different value that will itself be re-examined next round. So a node survives iff no adjacent node shares its value iff its value occurs exactly once. When the lookahead can no longer fire, the remaining suffix has 0 or 1 nodes, trivially duplicate-free.

## Complexity
$O(n)$ time: the outer walk advances `prev` at most n times, and every inner-sweep iteration removes a node permanently — total work across all sweeps is bounded by n. $O(1)$ space. No hash map needed; sortedness IS the index.

## Pitfalls
- Unlinking only ONE node of a run: `[2,2,2]` leaves one 2 behind. The inner `while` must compare against the remembered `dup` value, not against `prev->next->next` (after the first unlink the comparison basis shifts under you).
- Forgetting `dup` and re-reading `prev->next->v` as the run value after unlinks: the node there may already be the NEXT run's start.
- Advancing `prev` after a sweep: you skip examination of the fresh `prev->next`. With two touching runs (`[1,1,2,2,3]`), the second run's detection needs `prev` to still sit before it — prev never enters a run; it only moves onto confirmed-unique nodes.
- No dummy head: `[1,1,2,3]` needs to delete the head run — without a sentinel you need a separate "trim leading runs" loop, and it's easy to leave one victim alive.
- Loop guard testing only `prev->next`: the lookahead `prev->next->next->v` dereferences null on the final single node.
- Recursion (`if dup: skip run, recurse`): depth is O(n) in the worst case of all-unique values — stack overflow near 10^4+ in tight-stack environments. The iterative version above is the one to write.
