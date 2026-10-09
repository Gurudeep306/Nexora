## Intuition
The intersection page's switch-partners trick ($p_A$ jumps to headB when it hits null, and vice versa) infinite-loops the moment a cycle exists — the pointers never reach null. The $O(1)$-space answer is a CASE ANALYSIS on Floyd's cycle detector, and the whole problem hinges on one structural fact: **a shared node drags both chains into the same cycle**. So if exactly one list cycles, they cannot share anything. And crucially — compare NODE POINTERS throughout, never values; equal values prove nothing.

## Approach
Run Floyd on both heads (detect cycle + entrance: after slow/fast meet, restart one at the head and walk both by 1 — they meet at the entrance). Then three cases:

```cpp
// (1) neither cycles: length-align (or switch partners), walk together
//     until the pointers are EQUAL — the first shared node, or both null (-1).
// (2) exactly one cycles: return -1. A shared node would force both into
//     the same cycle, contradicting one being acyclic.
// (3) both cycle: compare ENTRANCES.
if (entA == entB) {
    // the Y-junction happens BEFORE the cycle: aligned walk bounded by the
    // entrance — advance the longer head-to-entrance chain by the difference,
    // then walk in lockstep; they meet at the first shared node (<= entA).
} else {
    // entrances differ: they intersect iff entB lies ON A's cycle.
    Node* p = entA;
    do {
        if (p == entB) return indexOf(entA along A);  // first shared node IS entA
        p = p->next;
    } while (p != entA);
    return -1;   // disjoint cycles
}
```

Why "first shared node is entA" in the different-entrance branch: if entB sits on A's cycle, then walking B eventually enters A's cycle at entB — but A reaches its cycle at entA, and entA is on B's path too (B reaches entB, then loops around to entA... more precisely, both chains merge into the one cycle; the earliest node of A that B ever touches is entA, since A's pre-cycle part is private to A — if any of it were shared, the entrances would coincide). The answer is the index of entA counted along A from its head.

Building the input: allocate the shared nodes ONCE and point both lists' tails into them; if `pos >= 0`, link `shared[nc-1].next = shared[pos]`. The cycle is a property of NODES, not of either list — that's what makes the pointer comparisons meaningful.

## Why it works
Case (2): suppose they shared a node $x$ while A cycles and B doesn't. From $x$, following `next` is deterministic — B would traverse A's cycle forever and never terminate, contradicting B's acyclicity. Case (3), same entrance: both chains funnel into the cycle at the SAME node, so the shared part is a Y (possibly degenerate) whose junction lies at or before the entrance; the head-to-entrance segments are ordinary acyclic chains, so length alignment finds the first common node, and the walk is bounded because the pointers must coincide by the entrance at the latest. Case (3), different entrances: each list's pre-entrance chain is private (a shared pre-entrance node would give a common funnel and hence equal entrances), so intersection can only happen on the cycle — possible iff entB is reachable from entA along the cycle, i.e. lies on A's ring; the do-while walks exactly one lap. Case (1) is the standard alignment argument: after equalizing, both pointers are the same distance from the tail and step in lockstep, so they meet at the first common node or both expire at null.

## Complexity
$O(n_a + n_b + n_c)$ time — Floyd is linear per list, entrance finding is linear, each case's walk is at most one or two traversals. $O(1)$ space beyond the nodes themselves. The $n = 2 \cdot 10^4$ worst case is trivially linear; a "mark visited nodes with a set" solution is $O(n)$ space and disqualified.

## Pitfalls
- Comparing VALUES instead of pointers: two nodes with equal values are not the same node. Every comparison here is `==` on addresses.
- Switch-partners without the cycle check: infinite loop. Run Floyd FIRST, always.
- Building the shared tail twice (once per list): the lists then never actually share nodes and every pointer test says "no intersection". Allocate shared nodes once; both tails point in.
- In the different-entrance branch, returning the index of entB or of the meeting point instead of entA: the first node A traverses that B also traverses is entA.
- Forgetting `nc = 0` → no shared part at all (answer −1 even when both lists are nonempty), and null heads (na = nc = 0) → Floyd must not dereference null.
- Bounding the same-entrance aligned walk incorrectly: it must stop at the entrance at the latest; an unbounded walk that "waits for equality" is still correct here (they meet at or before the entrance), but forgetting the distance equalization makes them walk past each other forever on the cycle.
