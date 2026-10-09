# ll-c-remove-val — Remove every x

## Intuition
Deleting an interior node is easy — you have `prev`. Deleting the HEAD is the annoying case: there is no predecessor, so "remove the head" needs its own branch, and if the first several nodes all match, you'd rewrite that branch in a loop. The dummy head deletes this entire class of pain: hang a sentinel node before the head, and now EVERY node has a predecessor. The head is no longer special; it is just `dummy.next`.

## Approach
```cpp
Node* prev = &dummy;
while (prev->next) {
    if (prev->next->v == x) {
        Node* victim = prev->next;
        prev->next = victim->next;   // unlink; prev stays put
        delete victim;
    } else {
        prev = prev->next;           // only advance when we KEEP the node
    }
}
return dummy.next;                   // never return the original head
```

Two details carry the whole solution:
1. **`prev` lags one node behind the examination point.** We always inspect `prev->next`, never `prev` itself, so the node we unlink always has a wired predecessor.
2. **After an unlink, prev does NOT move.** The new `prev->next` is a node we have never looked at — it might also equal x (runs like `[2,2,2,2]`). Advancing would skip it.

## Why it works
Invariant: every node before and including `prev` has been examined and does not equal x; every node from `prev->next` onward is untouched. Each iteration either unlinks one matching node (invariant preserved: prev's prefix is unchanged and still clean) or examines one node, finds it clean, and extends the prefix by one. The walk ends when `prev->next` is null, i.e. the untouched suffix is empty — so every node was examined and all matches were unlinked. `dummy.next` is the surviving head by construction; when everything matched, it is null → EMPTY.

## Complexity
$O(n)$ time — each node is examined exactly once, each unlink is O(1). $O(1)$ space. The dummy costs one node and buys the removal of every head special-case.

## Pitfalls
- Advancing `prev` after an unlink: `[1,1,1,2]` with x=1 keeps the second 1. The unexamined `prev->next` after a splice is the classic bug.
- Returning the original `head` pointer: if the head was a victim it's stale garbage (or freed memory in C). Always return `dummy.next`.
- Examining `prev` instead of `prev->next`: then the first real node needs separate handling and you're back to head special-cases — the dummy's entire purpose evaporates.
- No dummy, hand-rolled head loop (`while (head && head->v == x) head = head->next;` then the prev-walk): it works, but it's two loops to keep straight and easy to get subtly wrong; the dummy folds both into one.
- Leaking unlinked nodes in C/C++: `prev->next = victim->next` orphans the victim — free/delete it right there.
- n = 0: the loop never runs, `dummy.next` is null → EMPTY. The dummy handles it with no branch; make sure your output layer does too.
