## Intuition
Two templates you already own, composed: fast/slow pointers (when fast reaches the end, slow sits at the middle) and the deletion discipline (to delete a node you need its PREDECESSOR — the victim itself is useless). The wrinkle: one pass, so you cannot find the middle first and then re-walk for the predecessor. Carry a `slowPrev` one step behind slow — or equivalently start both walkers from a dummy head so the predecessor is always at hand. The dummy also absorbs the ugliest special case: on a 1-node list the victim IS the head, and the answer is simply `dummy.next == null` → `EMPTY`.

## Approach
```cpp
Node dummy{0, nullptr};
dummy.next = head;
Node* slow = &dummy;       // will end on the victim's PREDECESSOR
Node* fast = &dummy;
while (fast->next && fast->next->next) {
    slow = slow->next;     // slow trails fast by half
    fast = fast->next->next;
}
// slow->next is the middle (second middle on even n)
Node* victim = slow->next;
slow->next = victim->next; // bypass
delete victim;
return dummy.next;
```

Trace the loop: starting both at the dummy, fast advances 2 per round and the loop runs exactly $\lfloor n/2 \rfloor$ times, landing slow on position $\lfloor n/2 \rfloor - 1$ — the predecessor of node $\lfloor n/2 \rfloor$, which is the SECOND middle on even n ([1,2,3,4]: slow ends at 2, victim = 3 ✓) and the true middle on odd n ([1,2,3,4,5]: slow ends at 2, victim = 3 ✓).

Without a dummy you'd instead track `slowPrev` explicitly — slow and fast start at head, fast one step ahead, and each round `slowPrev = slow; slow = slow->next; fast = fast->next->next` — but then n = 1 needs a hand-written `return null`. The dummy deletes that special case.

## Why it works
Invariant: before round $t$ (1-indexed), fast sits at position $2t - 3$ counting the dummy as $-1$; the round runs iff positions $2t - 2$ and $2t - 1$ exist, i.e. $2t - 1 \le n - 1$, so exactly $T = \lfloor n/2 \rfloor$ rounds run and slow ends at position $T - 1 = \lfloor n/2 \rfloor - 1$. The victim `slow->next` is therefore node $\lfloor n/2 \rfloor$: for even $n$ that is node $n/2$ — the SECOND of the two middles ([1,2,3,4] → victim is node 2, value 3 ✓); for odd $n$ it is node $(n-1)/2$ — the true middle ([1,2,3,4,5] → value 3 ✓). And $n = 1$: zero rounds, slow is the dummy, the victim is the head, and `dummy.next` is null → EMPTY. Bypassing with `slow->next = victim->next` is the standard $O(1)$ unlink; the dummy guarantees a predecessor exists even when the victim is the head. One traversal, no counts, no arrays.

## Complexity
$O(n)$ time — fast touches each node once. $O(1)$ space — three pointers. "One pass" matters when the list lives in slow storage or arrives as a stream and re-walking is expensive; that's why interviewers insist on it.

## Pitfalls
- Even-length convention: the SECOND middle must die ([1,2,3,4] → delete 3, keep 2). Starting fast at `head->next` instead of the dummy flips this to the first middle — check against the spec, not memory.
- No predecessor tracking: with slow starting at head you can't unlink a head victim; the dummy (or `slowPrev`) is mandatory.
- n = 1: the victim is the only node; the result is the empty list → print `EMPTY`, not a crash and not the old value.
- Loop condition `fast->next && fast->next->next`: shifts the stopping point one round earlier and picks the wrong middle on even n.
- Deleting before bypassing: `victim->next` is read AFTER `delete victim` — use-after-free. Bypass first, free second.
