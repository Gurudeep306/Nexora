## Intuition
Deletion is lookup plus two twists. Twist one: you cannot delete a node you're standing ON — a singly linked list only lets you rewrite the *predecessor's* `next` — so the fixed gap must be $n+1$, not n: when `first` falls off the end, `second` sits one node BEFORE the victim. Twist two: when the victim IS the head ($n = \text{length}$), its predecessor doesn't exist — a **dummy head** manufactures one, and the same slide code handles the boundary with zero special cases. The unlink itself is the standard skip-over: `second->next = second->next->next`.

## Approach
```cpp
Node dummy{0, head};
Node* first  = &dummy;          // BOTH start at the dummy: gap n+1
Node* second = &dummy;
for (int i = 0; i < nth + 1; i++) first = first->next;
while (first) {
    first  = first->next;
    second = second->next;
}
// second is the victim's predecessor (possibly the dummy itself)
second->next = second->next->next;   // skip over the victim
return dummy.next;
```
Trace $[1,2,3,4,5]$, $n = 2$: gap loop moves first 3 steps to index 3 (value 4); sliding three rounds puts first at null and second at index 2 (value 3) — the predecessor of the victim 4. Skip-over yields `1 2 3 5`. Boundary $n = 5$: first lands null right after the gap loop, second never moves — it's the dummy, and `dummy.next = dummy.next.next` removes the head. Result: `2 3 4 5`.

## Why it works
Starting both pointers at the dummy and separating them by $n+1$ freezes the invariant $\text{index}(first) - \text{index}(second) = n+1$ (null counts as index length). The slide preserves it and stops at $\text{index}(first) = \text{length}$, hence $\text{index}(second) = \text{length} - n - 1$ — exactly the predecessor of the node at $\text{length} - n$ (the nth from the end). Because the dummy occupies index $-1$, the formula stays valid when the victim is the head: $\text{length} - n - 1 = -1$ is the dummy. The skip-over rewires the predecessor past the victim; the victim becomes garbage but nothing points to it, so the survivors form the correct list. $1 \le n \le \text{length}$ guarantees the gap loop stays on the list (from the dummy, $n+1 \le \text{length}+1$ hops land at worst on null).

## Complexity
$O(\text{length})$ time — one pass: length$+n+1 \le 2\,\text{length}+1$ hops. $O(1)$ space — dummy plus two pointers.

## Pitfalls
- Gap n instead of $n+1$: second lands ON the victim and you have no predecessor to rewrite — people then "fix" it by copying the next node's value into the victim, which breaks when the victim is the tail.
- No dummy head: the $n = \text{length}$ case (victim = head) needs a separate branch, and forgetting it either crashes or leaves the head in place.
- Starting `second` at head but `first` at the dummy (or vice versa): the gap silently becomes n or $n+2$.
- Returning `head` instead of `dummy.next`: after deleting the head, `head` still names the removed node.
- Single-node list: the result is empty — print `EMPTY`, not a blank line.
