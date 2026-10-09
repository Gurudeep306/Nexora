# ll-c-insert-sorted — Insert into a sorted list

## Intuition
The list is non-decreasing, so the insertion spot is fully determined: x belongs after the last node that is ≤ x. One walk finds it. Two edge cases threaten to need branches — "x is smaller than everything" (new head) and "x is bigger than everything" (new tail) — and the dummy head with a $-\infty$ value dissolves the first one: the sentinel is ≤ x for every possible x, so the walk can always legally start, and the head case is just "the walk stopped immediately."

## Approach
```cpp
Node dummy{LLONG_MIN, nullptr};      // -inf sentinel
// ...build list hanging off dummy...

Node* prev = &dummy;
while (prev->next && prev->next->v <= x)   // stop at first node NOT <= x
    prev = prev->next;
Node* nd = new Node{x, prev->next};        // splice: two writes
prev->next = nd;
```

The loop condition `prev->next->v <= x` — with `<=`, not `<` — is the **stability choice**: the walk slides past existing equals, so x lands AFTER all nodes equal to it. With `<` it would land before them. Both keep the list sorted; `<=` is the convention merge sort's merge uses, and it makes repeated inserts of the same value preserve insertion order.

Stopping conditions and what they mean:
- `prev->next == null`: everything was ≤ x → splice after the tail → x is the new tail. No branch.
- `prev == &dummy`: the very first node was > x → splice right after the sentinel → x is the new head. No branch.
- Otherwise: an interior splice between `prev` and `prev->next`.

## Why it works
Let P be the successor of the node where the walk stops. Every node before P satisfies $v \le x$ (the loop kept advancing through them), and P itself — if it exists — satisfies $v > x$ (that is why the loop stopped). Inserting x immediately before P puts it between a left neighbor with $v \le x$ and a right neighbor with $v > x$, so both new adjacencies respect the order. Since every other adjacency was already sorted, the whole list remains non-decreasing. The walk visits each node at most once, so it terminates at the tail at worst.

## Complexity
$O(n)$ to find the spot — unavoidable on a list, there is no random access — and $O(1)$ for the splice itself (two pointer writes). An array also needs $O(n)$ (finding the spot is even $O(\log n)$ with binary search, but the splice SHIFTS $O(n)$ elements); the list's honest selling point is that the splice never copies data. $O(1)$ extra space.

## Pitfalls
- `<` instead of `<=` in the loop: x lands BEFORE existing equals. Sorted either way, but unstable — and wrong under this problem's tie rule ("x goes after the existing equals").
- A plain 0-valued dummy instead of $-\infty$: inserting $x < 0$ stops the walk at the dummy... which is exactly right, but only by accident of never comparing the dummy's value. If your loop ever compares `prev->v` (not `prev->next->v`), a finite dummy corrupts the order. The $-\infty$ value makes the sentinel honest under any comparison.
- Splicing in the wrong order: `nd->next = prev->next` MUST come before `prev->next = nd`, or you overwrite the only pointer to the suffix and lose the tail of the list.
- Forgetting the tail case check `prev->next == null` — you don't! That's the beauty: `prev` may be the real tail, and `prev->next = nd` with `nd->next = null` just appends. Writing a separate append branch is redundant code that can desync.
- Walking past the tail by testing `prev->v <= x` instead of `prev->next->v <= x`: you advance onto the tail and then dereference null.
