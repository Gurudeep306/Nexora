## Intuition
Counting the 0s, 1s and 2s and rewriting values is the array answer — it destroys satellite data hanging off the nodes and isn't relinking at all. The list answer: grow THREE dummy-headed chains (zeros, ones, twos) as you walk the input, routing each node to the tail of its chain. Arrival order inside each chain is preserved automatically — the sort is STABLE for free — then concatenate with two writes. One pass, $O(1)$ space, zero allocations beyond the three dummies.

## Approach
```cpp
Node d0{0,nullptr}, d1{0,nullptr}, d2{0,nullptr};
Node *t0 = &d0, *t1 = &d1, *t2 = &d2;
Node* cur = head;
while (cur) {
    Node* nxt = cur->next;     // save: cur is about to leave the input
    Node* tail = (cur->v == 0) ? t0 : (cur->v == 1) ? t1 : t2;
    tail->next = cur;          // route to its chain's tail
    if (cur->v == 0) t0 = cur; else if (cur->v == 1) t1 = cur; else t2 = cur;
    cur = nxt;
}
t2->next = nullptr;            // SEAL the last tail — the whole bug surface
d0.next ? (t0->next = d1.next) : (void)0;   // concatenate, skipping empty chains
d1.next ? (t1->next = d2.next) : (void)0;
return d0.next ? d0.next : (d1.next ? d1.next : d2.next);
```

Two disciplines do all the work. The **seal**: the last node routed to the twos chain still has its old `next` pointing back into the input — without `t2->next = nullptr` the "sorted" list re-drags leftover input nodes (often in an infinite loop, since those nodes were also routed into chains). The **concatenation** must skip empty chains: if there are no zeros, `d0.next` is null and the head is `d1.next`; the tails `t0`/`t1` only exist meaningfully when their chain is non-empty (a dummy tail's `next` write is harmless, but joining through an empty chain via `t0->next = d1.next` when `t0 == &d0` is exactly the right write — the dummy's next IS the chain head — so the conditional form above stays correct in every combination).

## Why it works
Invariant: after each iteration, every node walked so far sits in exactly one chain, at its tail, in arrival order, and `cur` heads the untouched remainder. Routing is by value, so at the end chain 0 holds every 0, chain 1 every 1, chain 2 every 2, each internally in original relative order (each append goes to the tail, never the head — head-insertion would reverse each chain). Sealing `t2->next` terminates the concatenated list; the other two chain-ends get overwritten by the concatenation writes themselves (`t0->next = d1.next`, `t1->next = d2.next`), so only the LAST chain needs the explicit seal. Concatenating 0s→1s→2s yields a non-decreasing sequence containing every original node exactly once — sorted, by relinking only.

## Complexity
$O(n)$ time — one routing per node, two concatenation writes. $O(1)$ space — three stack dummies and three tail pointers, no new nodes, no counters, no arrays. Counting sort is also $O(n)$/$O(1)$ but rewrites values and loses stability and satellite data.

## Pitfalls
- Forgetting `t2->next = nullptr`: the last two-node still points into the input; the output list either contains stray nodes or cycles forever. Seal the LAST chain (or seal all three, cheap insurance).
- Head-insertion into chains (`cur->next = d0.next; d0.next = cur;`): reverses each group — [0a, 0b] prints as 0b 0a. Append at tails.
- Concatenating blindly through `d0.next` when the zeros chain is empty: you print nothing (or crash on `t0->next` if t0 logic assumes non-empty). Pick the head from the first non-empty chain.
- Reading `cur->next` after routing `cur` into a chain: the chain write `tail->next = cur` doesn't touch `cur->next`, but the seal later does — save `nxt` before the loop body, always.
- Counting values and overwriting node values: passes the sample, fails the interview — the point is relinking nodes that may carry payloads.
