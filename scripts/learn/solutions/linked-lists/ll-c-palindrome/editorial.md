## Intuition
A palindrome check "needs" the second half backwards — and the only $O(1)$-space way to get a singly linked list backwards is to *reverse it in place*. So the algorithm is a composition: find the split point with fast/slow, reverse the second half, compare, and — the part everyone forgets — **reverse it back and relink it**, on BOTH exits including the mismatch early-return. A query that mutates its input is a design bug; judges that re-traverse the list after your call fail you on the spot.

## Approach
```cpp
if (!head) return true;                       // empty list reads the same both ways
// split: next-next guard leaves slow at the LAST node of the first half
Node* slow = head;
Node* fast = head;
while (fast->next && fast->next->next) {
    slow = slow->next;
    fast = fast->next->next;
}
Node* secondHead = slow->next;                // floor(n/2) nodes AFTER slow
slow->next = nullptr;                         // CUT
secondHead = reverse(secondHead);             // reverse second half in place

// compare: q (the reversed, shorter-or-equal half) drives the loop
bool ok = true;
Node* p = head;
for (Node* q = secondHead; q; q = q->next, p = p->next) {
    if (p->v != q->v) { ok = false; break; }
}

slow->next = reverse(secondHead);             // RESTORE on both exits
return ok;
```
The guard leaves slow at index $\lceil n/2 \rceil - 1$: on odd n ($n=5$) slow is index 2 — the middle rides in the FIRST half; the second half is the $\lfloor n/2 \rfloor$ nodes after slow and the middle is never compared (it mirrors itself). On even n ($n=4$) slow is index 1 and the halves are 2+2.

## Why it works
After the cut, the first half has $\lceil n/2 \rceil$ nodes and the reversed second half has $\lfloor n/2 \rfloor$; the reversed half's order is exactly the original list read backwards from the tail. Comparing $p$ (front→) against $q$ (tail→) for all $\lfloor n/2 \rfloor$ positions of $q$ checks every mirrored pair: position $i$ of the list against position $n-1-i$. On odd n the unpaired middle index $\lfloor n/2 \rfloor$ maps to itself, so skipping it loses nothing. Driving the loop with $q$ guarantees we never walk past the first half (it is the longer-or-equal one). Restoring re-reverses the half (reversal is an involution) and the relink `slow->next` glues it back at the original position, so the caller sees the untouched list regardless of the outcome.

## Complexity
$O(n)$ time — split $n/2$ steps, two reversals of $\lfloor n/2 \rfloor$ nodes each, comparison $\le n/2$: all linear, about $2.5n$ pointer hops. $O(1)$ space — no arrays, no recursion. (The recursive "compare on the way back" version is $O(n)$ stack and crashes near $n = 10^4$.)

## Pitfalls
- Forgetting the restore, or restoring only on the happy path: the mismatch `break` must fall through to the restore too. Structure the code so there is exactly ONE restore statement after the comparison, not one per exit.
- Wrong guard: `while (fast && fast->next)` puts slow at the second middle on even n — you'd cut the halves 3+1 on $n=4$ and compare a node against itself's neighbor. The next-next guard is the one that yields first-half $\lceil n/2 \rceil$.
- Driving the compare loop with `p` instead of `q`: on odd n `p` runs one node longer than the half and dereferences null.
- $n = 0$ and $n = 1$: the empty list must not reach the fast/slow loop (`fast->next` on null crashes); return 1 immediately. For $n = 1$, secondHead is null, the compare loop never runs, and reversing null must be handled (return null).
- Comparing node identity instead of values — here it's the reverse of the cycle problems: palindrome is about VALUES.
- Recursion depth: an $n = 10^4$ recursive comparison overflows the default stack in every language; stay iterative.
