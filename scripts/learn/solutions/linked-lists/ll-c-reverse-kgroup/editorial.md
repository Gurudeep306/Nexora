## Intuition
"k-groups" is the sub-range reverse on repeat, and the hard part is *not* the flip — it's knowing when to stop. A partial final group (fewer than k nodes left) must stay untouched, so before every flip you **probe**: walk k nodes ahead from the group's head; if you fall off the end, the remaining nodes are the partial group and you're done. Probe-then-flip means the flip loop never dereferences a null `next`. The other recurring annoyance is that each group's reversal changes which node heads it, so you keep an **anchor** `groupPrev` — the node just before the current group — and never let go of it until both stitches are done.

## Approach
```cpp
Node dummy{0, head};
Node* groupPrev = &dummy;
while (true) {
    // PROBE: is there a full group of k after groupPrev?
    Node* probe = groupPrev;
    for (int i = 0; i < k && probe; i++) probe = probe->next;
    if (!probe) break;                     // partial group: leave as is

    Node* groupHead = groupPrev->next;     // bookmark: becomes the group's tail
    Node* prev = nullptr;
    Node* cur  = groupHead;
    for (int i = 0; i < k; i++) {          // exactly k flips
        Node* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur  = nxt;
    }
    groupPrev->next = prev;                // front stitch: new head of group
    groupHead->next = cur;                 // back stitch: old head (now tail) -> rest
    groupPrev = groupHead;                 // anchor moves to this group's tail
}
return dummy.next;
```
Trace $[1,2,3,4,5]$, $k=2$: group 1 flips to `2,1` with back stitch `1->3`; anchor is now node 1; group 2 flips to `4,3` with `3->5`; anchor is node 3; the probe from node 3 finds only `5` then null — stop. Result `2,1,4,3,5`.

## Why it works
Each outer iteration consumes exactly k nodes: the probe guarantees k nodes exist, so the k-flip loop's invariant (reversed prefix `prev`, untouched suffix `cur`) exits with `prev` = old k-th node (new group head), `cur` = first node after the group, and `groupHead` = old first node (new group tail). The front stitch attaches the new head to everything before, the back stitch attaches the tail to everything after — identical to reverse-between, with the anchor playing the role of position $m-1$. Then the anchor advances to the just-finished tail, which is exactly the node preceding the next group, so the invariant "everything up to `groupPrev` is final" holds. Every node is probed once and flipped once ⇒ $O(n)$; termination follows because each iteration moves `groupPrev` forward by k ≥ 1 nodes.

## Complexity
$O(n)$ time — two touches per node (probe + flip), both $O(1)$ amortized per node; the probe of one group overlaps the *previous* group's nodes zero times since it starts after `groupPrev`. $O(1)$ space. A recursive version costs $O(n/k)$ stack and crashes on deep inputs for small k — keep it iterative.

## Pitfalls
- Skipping the probe: the flip loop then runs past the tail (`cur->next` on null) or silently reverses a partial group — the classic "works only when n % k == 0" bug.
- Advancing the anchor to `prev` (the new head) instead of `groupHead` (the new tail): the next probe starts inside the finished group and reverses it again.
- Back-stitching before the front stitch is fine, but forgetting the bookmark and trying `groupPrev->next->next = cur` after the front stitch re-reads an already-relinked pointer — you'd stitch from the NEW head, creating a cycle.
- $k = 1$ must be a no-op; with the probe version it is (each group flips one node onto itself), but hand-rolled "swap" versions often special-case it wrongly.
- Recursion depth $n/k$ blows the stack for $n = 10^4, k = 1$.
