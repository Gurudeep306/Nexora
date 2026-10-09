## Intuition
Partition is a *routing* problem: every node goes left (`v < x`) or right (`v >= x`), and inside each side arrival order must survive. On an array, stability costs work (quicksort's partition is famously unstable); on a list it is **free** — grow two dummy-headed chains as you walk, appending each node to the chain it belongs to, and appending never reorders. Then concatenate with one write. The only subtlety is sealing the right chain's tail.

## Approach
```cpp
Node lessD{0, nullptr}, geqD{0, nullptr};   // two dummies own the two chains
Node* less = &lessD, *geq = &geqD;
for (Node* cur = head; cur; cur = cur->next) {
    if (cur->v < x) { less->next = cur; less = cur; }
    else            { geq->next = cur; geq = cur; }
}
geq->next = nullptr;        // SEAL: the last routed node still has its old next!
less->next = geqD.next;     // concatenate: one write
return lessD.next;
```

The seal is the discipline that decides correctness: `cur` nodes were routed without clearing their `next`, so the last node sent right still points at whatever followed it in the *input* — possibly a node now living in the left chain. Without `geq->next = nullptr` the output re-drags input nodes into a cycle or the wrong order. (The left chain needs no seal: `less->next = geqD.next` overwrites its tail's stale pointer anyway.)

## Why it works
Invariant: after visiting $k$ nodes, the less-chain contains exactly the first $k$ nodes' `< x` members in visit order, the geq-chain the `>= x` members in visit order, and no other links are relied upon. Routing appends to a tail, so each chain's order equals arrival order — stability comes from the walk, not from any comparison. After $n$ visits every node is in exactly one chain; the seal makes the geq-chain a proper list; the concatenation makes one list whose left part is all `< x` and right part all `>= x`, each stable. Equal values go right, in arrival order — matching `[1,4,3,2,5,2]`, $x = 3$ → `[1,2,2,4,3,5]`.

## Complexity
$O(n)$ time — one pass, one comparison and two writes per node. $O(1)$ space — two dummies and two tail pointers, zero allocations.

## Pitfalls
- Skipping `geq->next = nullptr`: the classic bug — stale tail pointer re-drags input nodes; symptoms range from duplicated values to an infinite list.
- Concatenating as `geq->next = lessD.next` (wrong direction) or forgetting to concatenate at all (left chain only).
- Returning `head`: the original head may have been routed right — the answer head is `lessD.next`.
- Using `<=` for the left chain: equals must go RIGHT per the spec; `<=` also breaks nothing structurally but fails the fixture.
- Both chains empty-checked: if every node went right, `lessD.next` is the dummy's null — `less->next = geqD.next` still fixes it; that's the beauty of dummies. Print `EMPTY` only when `lessD.next` is null.
