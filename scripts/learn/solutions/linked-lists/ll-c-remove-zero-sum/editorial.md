# ll-c-remove-zero-sum — Erase consecutive runs summing to zero

## Intuition
"A consecutive run sums to zero" is a prefix-sum fact in disguise. Write $P_j = v_1 + \dots + v_j$ (with $P_0 = 0$ at a sentinel before the head). The run from position $i+1$ through $j$ sums to $P_j - P_i$, so it vanishes exactly when $P_j = P_i$. Deleting zero-sum runs repeatedly therefore reduces to one statement: **whenever two nodes share a prefix sum, everything between them goes**. Hang this off a dummy head so that $P_0 = 0$ is a real node too — then a prefix that returns to 0 (a run starting at the head) is just another equal pair, no special case.

## Approach
Two passes over the same list, one map from prefix sum to node:

```cpp
// Pass 1: store the LAST node reaching each prefix sum
unordered_map<long long, Node*> seen;
long long p = 0;
seen[0] = &dummy;                    // prefix 0 belongs to the sentinel
for (Node* t = dummy.next; t; t = t->next) {
    p += t->v;
    seen[p] = t;                     // overwrite: LAST occurrence wins
}

// Pass 2: rewrite links, jumping over dead zones
p = 0;
for (Node* t = &dummy; t; t = t->next) {
    p += t->v;                       // dummy contributes 0
    t->next = seen[p]->next;         // skip everything up to the last node with prefix p
}
```

Pass 2 walks the list *as it is being relinked*: when `t` jumps to `seen[p]->next`, the skipped block summed to zero, so the running prefix `p` at the landing node is still its true original prefix — the next map lookup stays valid. One pass, no repeats, no "delete a run and start over."

## Why it works
Why LAST occurrence is the magic choice. At node $u$ with prefix $p$, setting `u->next = seen[p]->next` deletes the maximal block after $u$ that sums to zero (maximal because `seen[p]` is the last node with that prefix, so the deleted block contains no node with prefix $p$ inside it). Suppose the final list still had a zero-sum run between surviving nodes $a, b$: their original prefixes would be equal, say $p$. When pass 2 processed $a$, it relinked $a$ directly to $\text{seen}[p]\text{->next}$, which is at or after $b$ — so $b$ could not have survived right after $a$, contradiction. Conversely a node survives only if it lies outside every maximal zero block: pass 2 lands exactly on nodes whose predecessors' jump targets skip them or keep them, and every kept node's value is printed. The order-independent claim in the statement (any removal order gives the same final list) is exactly the fact that the maximal-block decomposition is unique.

Nested runs compose for the same reason: `[3, 1, -1, -3]` has prefix 3 at both node 1 and node 4; `seen[3] = node4`, so the dummy-side walk from node1 jumps straight past everything — the inner `[1,-1]` never needs separate handling.

## Complexity
$O(n)$ expected time — two walks plus one hash operation per node ($O(n)$ worst case with a sorted-input-resistant map or the open-addressing table in main.c). $O(n)$ space for the map. Prefix sums need 64-bit range in general (here $|v| \le 1000$, n up to $2 \cdot 10^4$ fits in int, but the moment values reach $10^9$ a 32-bit sum overflows silently — use `long long`/`long` by habit).

## Pitfalls
- Storing the FIRST occurrence instead of the last: `seen[p]` then points to the earliest node, `t->next = seen[p]->next` can link BACKWARD or in place, and touching/nested runs fail. Last-occurrence is what makes jumps always go forward and compose.
- Forgetting `seen[0] = dummy`: runs that start at the head (`[1,-1,2]` → `[2]`) are never detected, because prefix 0's owner is missing.
- Recomputing the prefix in pass 2 from the relinked (shortened) list only: you must carry the running sum across jumps — it works precisely because skipped blocks sum to zero. Adding values of the NEW list from scratch happens to give the same numbers here, but thinking "the jump preserves the prefix" is the correct invariant.
- 32-bit prefix sums with large values: overflow turns equal sums unequal and blocks survive.
- Repeating "find one zero-sum run, delete, restart" — $O(n^2)$ and it still needs the map insight to be fast; the two-pass version does all orders of deletion at once.
- In pass 2, iterating `for (t = dummy.next; ...)` (skipping the dummy): the dummy is a real participant — prefix 0 pairs must be able to relink `dummy.next` itself.
