## Intuition
A child list INTERRUPTS the current level: you must dive into it, and then RESUME at the parent's `next`. That "dive and resume" is exactly what recursion does with call frames — and exactly what an explicit stack does with RETURN POINTS. The stack holds one thing per dive: the node you must come back to when the child subtree is exhausted. The flattened order is preorder — the parent itself, then its whole child subtree, then what followed the parent. Depth can be large, so the recursive version risks blowing the call stack; the explicit stack costs $O(\text{depth})$ and never crashes. This is the template for every iterative DFS you'll write on trees and graphs.

## Approach
Nodes arrive by index, so the `nextIdx[]`/`childIdx[]` arrays ARE the node table — the relinking is still explicit. Walk with `cur`; when `cur` has a child, push `nextIdx[cur]` (the return point), splice the child in (`nextIdx[cur] = childIdx[cur]`, `childIdx[cur] = -1`), and step into the child. When a level runs out (`cur == -1`), pop and resume:

```cpp
vector<int> stk;                 // return points
int cur = 0;                     // head is node 0
while (cur != -1 || !stk.empty()) {
    if (cur == -1) { cur = stk.back(); stk.pop_back(); continue; }
    order.push_back(v[cur]);     // preorder: settle THIS node first
    if (childIdx[cur] != -1) {
        stk.push_back(nextIdx[cur]);   // where to resume AFTER the child subtree
        nextIdx[cur] = childIdx[cur];  // splice the child in
        childIdx[cur] = -1;            // detach: flattening destroys the hierarchy
    }
    cur = nextIdx[cur];          // dive into child, or advance along the level
}
```

One subtlety: a popped return point may itself be $-1$ (the parent was its level's last node) — the `if (cur == -1)` guard at the top pops again, mirroring recursion unwinding several frames at once.

## Why it works
Invariant: at the top of each iteration, `cur` heads the level currently being flattened and the stack holds — bottom to top — the return points of every level above it, in dive order. Because the parent's old `next` sits on the stack and is only popped after the child level (and all of ITS dives) exhausts, the child subtree is emitted completely before anything that followed the parent — which is exactly "each child list spliced between its parent and the parent's next, depth-first". Each iteration settles one node and either dives (one push) or advances; pushes pair one-to-one with pops and every node is settled once, so the walk terminates. Nodes unreachable from node 0 are never visited and never printed — the output is the walk, not the table.

## Complexity
$O(n)$ time — each node settled once, each edge followed once, each push paired with one pop. $O(\text{depth})$ space for the stack: empty on a flat list, deep on a comb. Recursion costs the same asymptotically but on the call stack, where ~10^4 frames can crash; the explicit stack is the safe, generalizable version.

## Pitfalls
- Pushing `cur` instead of `nextIdx[cur]`: you'd resume AT the parent and re-visit it — the return point is what comes AFTER the parent.
- Forgetting to detach the child (`childIdx[cur] = -1`): the hierarchy must be gone after flattening; a second pass would splice the same subtree again.
- Not handling a popped $-1$: the parent was its level's last node; keep popping, never dereference $-1$.
- Emitting after the child dive instead of before (postorder): the parent must appear BEFORE its subtree — this is preorder.
- Recursive DFS on a deep structure: fine for n = 1000 in C++, a stack overflow risk elsewhere; the explicit stack is the point of the exercise.
