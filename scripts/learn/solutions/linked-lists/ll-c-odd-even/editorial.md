## Intuition
"Odd" means *position*, not value: 1st, 3rd, 5th nodes first, then 2nd, 4th, 6th — each group in its original relative order. Restate that out loud before coding; the misread is famous. The shape of the solution: two chains grow **inside one walk** — the odd chain and the even chain — because taking every second node is just two interleaved strides. At the end, one write glues the even chain onto the odd chain's tail. Zero allocations.

## Approach
```cpp
if (!head) return nullptr;
Node* odd  = head;           // anchors of the two growing chains
Node* even = head->next;
Node* evenHead = even;       // save: the even chain's head gets overwritten by strides
while (even && even->next) {         // even is the pointer that can run out mid-round
    odd->next  = even->next;         // odd skips one
    odd        = odd->next;
    even->next = odd->next;          // even skips one
    even       = even->next;
}
odd->next = evenHead;        // ONE write concatenates the chains
return head;
```

Each round moves the odd pointer to the next odd-position node and rewires the previous odd node to point at it; same for even. The nodes themselves never move — their `next` fields are re-pointed so that following `next` from `head` visits odds first, then (via `evenHead`) evens.

## Why it works
Invariant at the top of each round: `odd` is the last node of the odd chain, `even` the last of the even chain, and every node before them belongs to exactly one chain, correctly linked within it; `even->next` is the next unassigned node. The four writes assign the next odd-position node to the odd chain and the next even-position node to the even chain, preserving the invariant and advancing two positions. The guard `even && even->next` stops exactly when no further *pair* of assignments is possible — on odd $n$ the loop ends with `even == null` (the last odd node is already assigned), on even $n$ with `even->next == null` (the last even node is assigned and no odd follows). In both cases the two chains partition the list, and `odd->next = evenHead` concatenates them; `odd` is the odd chain's tail, so the write is safe.

## Complexity
$O(n)$ time — one pass, four writes per two nodes. $O(1)$ space, zero allocations.

## Pitfalls
- Losing `evenHead`: `even` strides away, and without the saved head you cannot concatenate — the even chain is unreachable and the result is just the odds.
- Guard `while (odd && odd->next)`: `odd->next` is an even-chain node mid-walk; dereferencing `even->next` when `even` is null crashes. `even` is the pointer that runs out first — guard it.
- Forgetting the final `odd->next = evenHead`: odds only. Worse, a stale `odd->next` may still point *into* the even chain mid-way, re-dragging nodes in the wrong order — the final write must run unconditionally.
- Filtering by `v % 2`: the values have nothing to do with it — positions do.
- Sealing: `even->next` is already null when the loop ends (that is why it ended), so no extra tail seal is needed — but know *why* before relying on it.
