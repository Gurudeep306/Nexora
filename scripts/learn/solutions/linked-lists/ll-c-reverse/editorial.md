## Intuition
Reversal rewires each node's `next` to point backward. The moment you flip `cur->next`, you lose access to the rest of the list — so the whole algorithm is "save before you sever": keep `nxt = cur->next` BEFORE the flip, then flip, then advance. Three pointers, one pass.

## Approach
```cpp
Node* prev = nullptr;
Node* cur  = head;
while (cur) {
    Node* nxt = cur->next;   // save FIRST
    cur->next = prev;        // flip
    prev = cur;              // advance
    cur  = nxt;
}
return prev;                 // prev is the new head (old tail)
```
At the top of every iteration the list is cut into two clean pieces: everything up to `prev` is already reversed, everything from `cur` onward is untouched. `nxt` is the bridge, held for exactly one statement.

## Why it works
Loop invariant: `prev` heads a fully reversed copy of the prefix already walked, and `cur` heads the untouched suffix. The flip moves one node from the suffix to the reversed prefix without losing either side (the save and the advance guarantee that). When `cur` is null the suffix is empty, so `prev` heads the reversed whole list. Each iteration makes progress of exactly one node, so the loop ends.

## Complexity
$O(n)$ time — one flip per node. $O(1)$ space — three pointers regardless of n. The recursive version is $O(n)$ stack and blows up past ~10^4 nodes; interviews expect the iterative one.

## Pitfalls
- Returning `head` instead of `prev`: after the loop `head` is the TAIL and its `next` is null — you'd print one value.
- Flipping before saving: `cur->next = prev` destroys the only path forward.
- Reading `cur->next` after `cur` became null: the `nxt` save inside the loop guard keeps every dereference safe.
