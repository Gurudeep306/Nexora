## Intuition
School addition runs from the ones digit upward — and the ones digit is the HEAD of each list. The reversal that looks like a handicap is a gift: the addition streams forward through both lists with a carry, exactly like merging two sorted lists. And the numbers are up to 100 digits — every machine integer type overflows, so the integer must NEVER be formed. Digits are the only currency.

## Approach
Walk both lists simultaneously with a carry. The loop condition does all the heavy lifting:

```cpp
int carry = 0;
Node dummy{0, nullptr};
Node* tail = &dummy;
Node* a = headA;
Node* b = headB;
while (a || b || carry) {
    int sum = carry;
    if (a) { sum += a->v; a = a->next; }
    if (b) { sum += b->v; b = b->next; }
    carry = sum / 10;
    tail->next = new Node{sum % 10, nullptr};
    tail = tail->next;
}
return dummy.next;
```

`a || b || carry` absorbs BOTH ragged lengths (342 + 46 keeps walking past B's end, treating missing digits as 0) AND the final carry (999 + 1: after both lists end, `carry == 1` forces one more iteration and the result grows a digit — no special case). The dummy head erases "is this the first node?" bookkeeping; the tail pointer appends in $O(1)$.

## Why it works
Invariant: after each iteration, the built chain equals the true sum's low-order digits produced so far, and `carry` holds exactly what school arithmetic would carry into the next column. Each column's computation is $\text{sum} = d_A + d_B + \text{carry}_{in}$, digit $= \text{sum} \bmod 10$, $\text{carry}_{out} = \lfloor \text{sum}/10 \rfloor$ — the same recurrence long addition uses, so by induction the chain is the sum. The loop ends because each iteration advances at least one of `a`, `b`, or drains the carry, and the carry is drained at most once after both lists end (a final carry into an empty column is at most 1, producing digit 1 and carry 0).

## Complexity
$O(\max(n_a, n_b))$ time — one node per output digit. $O(1)$ extra space beyond the output list itself. Never $O(\text{value})$: converting 100 digits to an integer is impossible in 64-bit arithmetic and disqualifying in an interview even with a big-int library.

## Pitfalls
- Forming the integer (`int num = num*10 + d`): overflows silently at ~19 digits. Stream digits instead.
- Loop condition `a && b`: truncates the longer list. `a || b || carry` is the whole trick.
- Forgetting the trailing carry: 99 + 1 → `0 0` instead of `0 0 1`. The `|| carry` term exists for exactly this.
- Appending without a tail pointer: $O(n^2)$ from walking the result each time.
- Returning `dummy` instead of `dummy.next`: the sentinel is not part of the answer.
