## Intuition
Splitting a list into ⌈n/2⌉ + ⌊n/2⌋ nodes is the primitive that powers palindrome checks and list merge sort — you can't index into a list, so the split point has to be FOUND by walking, and the cut has to be WRITTEN (`slow.next = null`). The right tool is the fast/slow pair with the **next-next guard**: `fast` starts one node ahead of `slow`, and the loop runs while fast can still take a double step. When it stops, `slow` is the last node of the first half — the node whose `next` gets cut.

## Approach
```cpp
if (!head->next) { firstHalf = head; secondHalf = nullptr; }  // n == 1
Node* slow = head;
Node* fast = head->next;               // fast starts ONE AHEAD
while (fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
}
Node* firstHalf  = head;
Node* secondHalf = slow->next;
slow->next = nullptr;                  // THE CUT
```
Trace the guard's stopping rule: with fast starting at index 1, after $r$ rounds fast is at index $1 + 2r$ (or null). The loop ends when fast can't double-step, leaving slow at index $\lceil n/2 \rceil - 1$ — the last first-half node. **Always trace n = 2 by hand**: slow at 0, fast at 1; guard checks fast (node 1) and fast->next (null) → loop never runs → split 1 + 1. With the wrong guard (`fast` also starting at head, or `while (fast->next && fast->next->next)`) a 2-node list splits 2 + 0 — and every recursion built on this split (merge sort!) never terminates, because a 2+0 split makes no progress.

## Why it works
Invariant: after $r$ rounds $\text{index}(slow) = r$ and $\text{index}(fast) = 1 + 2r$. The guard fails exactly when $1 + 2r \ge n - 1$, i.e. at the smallest $r$ with $2r \ge n - 2$, giving $r = \lceil n/2 \rceil - 1$ for $n \ge 2$. So the first half `head..slow` has $\lceil n/2 \rceil$ nodes and `slow->next..tail` has $n - \lceil n/2 \rceil = \lfloor n/2 \rfloor$. Odd n puts the middle node at index $\lfloor n/2 \rfloor = \lceil n/2 \rceil - 1$ = slow — the middle rides in the FIRST half, as the spec requires. The cut write is what makes the two halves independent lists; without it, printing the "first half" would run to the tail.

## Complexity
$O(n)$ time — one walk, about $n/2$ rounds. $O(1)$ space — two pointers and one write. This is the split step merge sort relies on: get it wrong and the $O(n \log n)$ sort becomes an infinite loop.

## Pitfalls
- The guard is the whole problem. `slow = head, fast = head` with `while (fast && fast->next)` lands slow at the SECOND middle on even n → halves of $n/2 + n/2$ on even n (accidentally right) but you must still verify odd n; the `fast = head->next` start is the version that matches ⌈n/2⌉+⌊n/2⌋ for BOTH parities.
- n = 2 splitting 2 + 0: the guard variant that causes this makes recursive merge sort hang forever. Trace n = 2, always.
- Forgetting the cut (`slow->next = null`): both "halves" are still the same list.
- n = 1: `fast = head->next` is null, the loop never runs, second half is null — print `EMPTY` for it, not a blank line.
- Printing the halves on one line, or the second half first — follow the spec: first half on line 1, second on line 2.
