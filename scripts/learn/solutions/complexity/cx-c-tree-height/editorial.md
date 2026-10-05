## Intuition
The textbook answer is a recursive `height(u) = 1 + max height(child)`. Its time is $\Theta(n)$, but its **space** is $\Theta(\text{height})$ stack frames. On a path of $2 \cdot 10^5$ nodes, that is $2 \cdot 10^5$ nested calls. Python's default limit is 1000, and Java's and C's default thread stacks overflow at roughly $10^4$–$10^5$ frames. Space complexity includes the call stack, so the fix is to move that stack onto the heap.

## Approach
Build child lists from the parent array, then run DFS with an **explicit stack** (or BFS with a queue). Store `depth[child] = depth[parent] + 1` when a child is pushed, and keep the maximum depth seen.

Simpler still: if every parent had a smaller index than its child, one forward loop would do. This input does **not** promise that (labels are shuffled), so do a real traversal.

Example: `5` / `1 1 2 3` gives depth[2] = depth[3] = 1 and depth[4] = depth[5] = 2, so the height is **2**.

## Why it works
Each node is pushed exactly once, when its parent is popped. The parent's depth is final at that moment, because it was set when the parent itself was pushed. By induction on depth, `depth[u]` equals the number of edges from the root to u. The height is the maximum over all nodes.

## Complexity
$O(n)$ time. $O(n)$ heap memory for the child lists, the depth array and the explicit stack, but $O(1)$ call-stack depth. The asymptotic space is the same as recursion; what changes is *which* memory is used, and the heap is far larger than the default call stack.

## Pitfalls
- Recursion: `sys.setrecursionlimit` alone still crashes CPython's C stack. Java needs a big-stack thread. Avoid both.
- n = 1: the parent line is empty and the answer is 0.
- Store children in flat arrays (CSR: counts, then offsets) in C/Java to avoid $2 \cdot 10^5$ small allocations.
