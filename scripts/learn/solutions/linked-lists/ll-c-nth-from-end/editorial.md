## Intuition
The nth-from-end position is $\text{length} - n$ from the front — but you're not allowed to know the length. The fixed-gap trick sidesteps the count entirely: send `first` n steps ahead of `second`, then slide BOTH one step per round. The gap between them is frozen at n, so the instant `first` falls off the end (becomes null), `second` must sit exactly n nodes before the end. One pass, no length variable — and when the nodes are a stream you cannot re-read, one pass is the *only* option.

## Approach
```cpp
Node* first  = head;
Node* second = head;
for (int i = 0; i < n; i++) first = first->next;  // build the gap: n steps
while (first) {                                    // slide until first falls off
    first  = first->next;
    second = second->next;
}
return second->v;                                  // nth from the end (n=1: tail)
```
Trace $[1,2,3,4,5]$, $n = 2$: the gap loop moves `first` two steps, from index 0 to index 2 (value 3), while `second` stays at index 0 — the gap is 2. Sliding: round 1 → first index 3, second index 1; round 2 → first index 4, second index 2; round 3 → first null (index 5), second index 3 — value 4, the 2nd from the end. ✓

## Why it works
After the gap loop, $\text{index}(first) - \text{index}(second) = n$ (counting the null position as index length). The slide loop preserves that difference exactly — both advance by one per round. It terminates when first reaches index length (null), at which point $\text{index}(second) = \text{length} - n$, which is by definition the nth node from the end ($n = 1 \Rightarrow$ index length$-1$, the tail). The problem guarantees $1 \le n \le \text{length}$, so the gap loop never walks off the list; on the boundary $n = \text{length}$, first ends up null immediately and second never moves — it correctly returns the head.

## Complexity
$O(\text{length})$ time — at most length$+n \le 2\cdot\text{length}$ pointer hops, a single pass. $O(1)$ space — two pointers, no counter, no array.

## Pitfalls
- Off-by-one on the gap: n steps gives *lookup* (this problem). For *deletion* you need the victim's predecessor, so the gap becomes $n+1$ plus a dummy head — mixing the two up deletes the wrong node.
- Sliding with `while (first.next)` instead of `while (first)`: second stops one node too early and you return the $(n+1)$-th from the end.
- Assuming $n <$ length: when $n = \text{length}$ the gap loop leaves first null before the slide ever runs; code that dereferences first inside the slide without the null check crashes.
- Two-pass (count then walk) is correct but violates the one-pass requirement — and fails outright on a stream.
- Building the gap from a dummy head here is harmless but unnecessary; the dummy only earns its keep in the deletion variant.
