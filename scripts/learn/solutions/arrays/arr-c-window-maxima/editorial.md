## Intuition
Recomputing each window's maximum is $O(k)$. Notice that once a larger value enters the window, every **smaller value before it** can never be a maximum again — it leaves earlier and is beaten for its whole remaining life. So keep only "candidates" in a deque of indices whose values **decrease** from front to back. The front is always the current maximum.

## Approach
For each i:
1. Pop from the back while `a[back] ≤ a[i]` (they are dominated), then push i.
2. If the front index has slid out (`front ≤ i − k`), pop it from the front.
3. Once `i ≥ k − 1`, output `a[front]`.

Example `1 3 -1 -3 5 3 6 7`, k = 3 → `3 3 5 5 6 7`.

## Why it works
Invariant: the deque holds, in order, exactly the indices in the window that are not dominated by a later index in the window, so their values strictly decrease. The window maximum is never dominated, so it is in the deque — and being the largest it is at the front. Removing a dominated index is safe because the dominating index stays in the window at least as long.

## Complexity
Each index is pushed once and popped at most once: $O(n)$ total, $O(k)$ space.

## Pitfalls
- Store **indices**, not values — you need them to know when the front expires.
- Pop with `≤` (not `<`) so equal values don't pile up; either works for correctness, `≤` keeps the deque smaller.
