## Intuition
Swapping a pair means re-pointing three arrows, and nothing else moves. Around an anchor `prev` (the node just before the pair), the pair is `a = prev->next`, `b = a->next`. After the swap the order is `prev → b → a → (rest)`, and that is exactly three writes. The two structural annoyances — "the first pair moves the head" and "don't start a pair with only one node left" — are absorbed by a **dummy** and a loop condition that demands two nodes.

## Approach
```cpp
Node dummy{0, nullptr};
dummy.next = head;
Node* prev = &dummy;
while (prev->next && prev->next->next) {   // a full pair exists
    Node* a = prev->next;
    Node* b = a->next;
    a->next = b->next;    // a adopts the rest of the list
    b->next = a;          // b points back at a
    prev->next = b;       // the chain now enters the pair through b
    prev = a;             // a is the pair's new tail = anchor for the next pair
}
return dummy.next;
```

Swap **nodes**, not `v` fields: value-swapping passes these fixtures but breaks the moment anything holds pointers *into* the list or nodes carry satellite data — and the relink version is what generalises to reversing k-groups.

## Why it works
Invariant: at the top of each round, everything up to `prev` is in final swapped order and `prev->next` starts the untouched suffix. The three writes transform `prev → a → b → S` into `prev → b → a → S` — a local rearrangement that touches no other pointer, and `a` ends as the last node of the swapped pair, so `prev = a` restores the invariant with a suffix two nodes shorter. The loop condition refuses to start when fewer than two nodes remain, so a leftover odd node is never touched. Termination: two nodes move to final position per round.

## Complexity
$O(n)$ time — three writes per pair, one pass. $O(1)$ space, zero allocations. The recursive form (`swap(head->next, ...)` first) is $O(n)$ *stack* and dies near $n = 10^4$; the iterative dummy form is the one to write.

## Pitfalls
- Write order matters: `prev->next = b` before `a->next = b->next` loses the rest of the list (`b->next` still points at `a`'s old successor only until `b->next = a` runs — do the `a`-side writes first, or save `b->next` explicitly).
- Forgetting `prev = a`: the next round swaps the *same* pair back — infinite loop on `[1,2]`.
- No dummy: the head changes on the first swap, so you must special-case `head = b` and then anchor at `a` anyway — the dummy erases the case.
- Loop condition `while (prev->next)`: dereferences `prev->next->next` on a lone odd node — crash.
- Value swap (`swap(a->v, b->v)`): correct output here, wrong lesson; interviewers ask for relinking and k-group reversal reuses it.
