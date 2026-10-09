## Intuition
The target order $L_0 \to L_n \to L_1 \to L_{n-1} \to \dots$ interleaves the front half with the **back half read in reverse**. A singly list cannot walk backwards — so make the back half walkable: reverse it. Then the problem is a zipper over two forward chains. Nothing here is new; the exercise is composing three known primitives — middle, reverse, merge-style zip — without losing a pointer. Say the three phases out loud before coding: the plan *is* the answer.

## Approach
**Phase 1 — middle + cut.** With the next-next guard, `slow` ends at index $\lceil n/2 \rceil - 1$, i.e. the last node of the first half; the second half (floor(n/2) nodes) starts at `slow->next`:

```cpp
Node* slow = head, *fast = head;
while (fast->next && fast->next->next) {
    slow = slow->next;
    fast = fast->next->next;
}
Node* second = slow->next;
slow->next = nullptr;             // cut: two independent lists
```

**Phase 2 — reverse the second half** (the three-pointer flip from ll-c-reverse): save, flip, advance.

**Phase 3 — zip.** Save BOTH successors before any write, then cross-link:

```cpp
Node *first = head, *f2 = second;
while (f2) {                      // second chain is shorter-or-equal: it drives the loop
    Node *t1 = first->next, *t2 = f2->next;   // save both BEFORE writing
    first->next = f2;
    f2->next = t1;
    first = t1;
    f2 = t2;
}
```

## Why it works
The cut yields first half $L_0..L_{\lceil n/2\rceil-1}$ (length $\lceil n/2 \rceil$) and second half $L_{\lceil n/2 \rceil}..L_{n-1}$ (length $\lfloor n/2 \rfloor$). Reversal makes the second chain $L_{n-1} \to L_{n-2} \to \dots$. One zip round transforms `first → t1` and `f2 → t2` into `first → f2 → t1` and repositions on `(t1, t2)`: after $j$ rounds the output prefix is $L_0, L_n, L_1, L_{n-1}, \dots$ exactly as specified, and `first`/`f2` head the un-zipped suffixes. Because the second chain is shorter (odd $n$) or equal (even $n$), `f2` hits null first; at that moment the last written `f2->next = t1` has already attached the leftover tail of the first chain (one node when $n$ is odd, nothing extra when even), so the list is complete and null-terminated with no seal needed — the loop's final write did it.

## Complexity
$O(n)$ time — three linear passes (middle, reverse, zip). $O(1)$ space — pointer rewiring only, zero allocations, zero recursion (an explicit loop everywhere; deep recursion on $10^4$ nodes would crash the stack).

## Pitfalls
- Not saving `t1`/`t2` before the writes: `first->next = f2` destroys the path forward; every subsequent read is garbage.
- Wrong middle guard: `while (fast && fast->next)` (the merge-sort guard) puts `slow` one node deeper on odd $n$, leaving the halves as floor/ceil the other way — the zip then ends with the *second* chain holding the leftover and drops or misplaces the middle node. The fixtures are ground truth for which convention this page uses.
- Forgetting the cut: the "second half" still has the first half's tail pointing into it; the zip re-drags nodes.
- Looping `while (first && f2)` and then trying to seal: on odd $n$ `first` still has one node when `f2` dies, and a manual `first->next = nullptr` AFTER the last cross-write can cut off the already-correct tail. Let `f2` drive; the invariant handles the seal.
- Copying values into new positions instead of relinking: right output, wrong exercise — nodes must be rewired.
