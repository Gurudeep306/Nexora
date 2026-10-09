## Intuition
Odd-even's sibling: thread TWO chains in ONE walk — take a node for chain A, the next for chain B, and so on. Relative order inside each chain is preserved automatically because every append goes to a tail. The entire bug surface is the **seal**: after the walk, the last node of each chain still points at whatever followed it in the INPUT — which belongs to the OTHER chain. Forget `tail.next = null` on both chains and your two "separate" lists stay tangled (or loop). Two dummy heads erase the empty/one-node special cases; two seals make the split real.

## Approach
```cpp
Node dA{0,nullptr}, dB{0,nullptr};
Node *tA = &dA, *tB = &dB;
Node* cur = head;
bool toA = true;
while (cur) {
    Node* nxt = cur->next;      // save BEFORE threading rewrites cur->next
    if (toA) { tA->next = cur; tA = cur; }
    else     { tB->next = cur; tB = cur; }
    toA = !toA;
    cur = nxt;
}
tA->next = nullptr;             // SEAL both tails...
tB->next = nullptr;             // ...either may still point into the other chain
return {dA.next, dB.next};
```

The save of `nxt` happens BEFORE the append because `tA->next = cur` may make `cur` some tail's successor — and later seals will overwrite `cur->next` itself. Reading `cur->next` after threading gives you the wrong node whenever the previous tail write already clobbered it. With dummies, an empty chain is just `d.next == null` — print `EMPTY` for that line, no special-casing of n = 0 or n = 1 in the loop.

## Why it works
Invariant: after $i$ iterations, the first $i$ input nodes are distributed — odd positions (1, 3, 5, …) in chain A, even positions (2, 4, 6, …) in chain B — each in arrival order, because each node is appended at its chain's tail and the walk visits positions in increasing order. The flip `toA = !toA` implements the alternation exactly. At the end, every node belongs to exactly one chain; the two seal writes terminate both chains, cutting the last cross-links into the input. Since node identity is preserved and only `next` pointers are rewritten, the two output lists together contain every original node once — a partition, not a copy. n = 1 → chain B is the dummy with `next == null` → `EMPTY` on line 2; n = 0 → both `EMPTY`.

## Complexity
$O(n)$ time — one routing per node plus two seals. $O(1)$ space — two dummies, two tails, one boolean; no new nodes. An index-based copy into two arrays is $O(n)$ space and misses the relinking point.

## Pitfalls
- Sealing only one tail (or none): the last A-node still points at the last B-node (or further along the input) — printing chain A drags chain B's nodes along, and printing B may loop.
- Saving `cur->next` AFTER the append: the previous iteration's tail write may already have modified `cur->next` — you'd skip or repeat nodes. Save first, thread second.
- Head-insertion (`cur->next = dA.next; dA.next = cur;`): reverses each chain; [1,2,3,4,5] would print `5 3 1`. Append at tails.
- Using the original `head` for output instead of `dA.next`: works for A but forget that B's real head is `dB.next`, not the second input node's stale pointer.
- Printing a blank line instead of `EMPTY` for an empty chain.
