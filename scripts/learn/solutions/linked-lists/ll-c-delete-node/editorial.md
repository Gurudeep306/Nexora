# ll-c-delete-node — Delete with no way back

## Intuition
Normal deletion needs the **predecessor**: `prev->next = victim->next` is the only unlink move a singly list has. But you are handed a pointer to the victim itself, with no head and no way to walk backwards — the predecessor is unreachable. So reframe the problem: you don't have to remove *that cell of memory*. You have to remove *that position's value* from the sequence. And the successor is right there, reachable, with a known predecessor — the node you hold.

## Approach
Turn the held node into its successor, then delete the successor:

```cpp
void deleteNode(Node* node) {
    Node* victim = node->next;   // the node we can actually unlink
    node->v = victim->v;         // steal its contents
    node->next = victim->next;   // bypass it
    delete victim;               // must still be freed
}
```

Two writes. The value sequence loses position idx exactly as required; the physical cell that disappears is idx+1, not idx. In C/C++ the bypassed node must still be `free`d/`delete`d — it is unreachable garbage after the bypass.

The walk in `main` exists only because the input gives an index; in the interview version the pointer is simply handed to you, and the function above is the entire answer.

## Why it works
Before: $\dots \to P \to [v_{idx}] \to [v_{idx+1}] \to S \to \dots$, and you hold the bracketed $[v_{idx}]$. After the copy, the held node contains $v_{idx+1}$; after the bypass, its `next` is S. The traversal from the head now reads $\dots, v_{idx-1}, v_{idx+1}, \dots$ — position idx's value is gone, and every other value appears once, in order. The precondition "never the tail" is what makes `node->next` dereferenceable; on the tail the trick is impossible (there is nothing to steal, and the tail's predecessor is exactly what you can't reach), so an honest answer says "return an error" there.

## Complexity
$O(1)$ time, $O(1)$ space — no traversal, no search. (The $O(idx)$ walk in the driver is scaffolding for the I/O format, not part of the algorithm.)

## Pitfalls
- Trying to find the predecessor: with only a singly list and no head, there is no path to it. Anyone who "walks from head" in an interview has quietly changed the problem.
- Applying this to the tail: `node->next` is null — null dereference. The API must forbid or detect it.
- Forgetting the caveats out loud: this **mutates values in place**. If another component holds a pointer to the successor, that data just vanished from under it; if nodes carry satellite data or identity (iterators, cache entries, keys in a hash map), copying one value forward corrupts them. Say this before the interviewer asks.
- In C/C++, leaking the bypassed node: after `node->next = victim->next` nothing can reach `victim` — free it in the same breath.
- Assuming the held cell is the one freed: it isn't — the held cell survives with new contents. Anything comparing node *addresses* before/after (not values) sees the "wrong" node disappear.
