## Intuition
Both term lists are sorted by DESCENDING exponent — so their sum is a merge-walk, the same muscle as merging two sorted lists, with one twist: on equal exponents you SUM the coefficients, and if the sum is zero the term VANISHES (cancel-and-drop). Growing the result with a dummy head + tail pointer makes the drop free: just don't append. No hash map, no sort — the inputs handed you sorted order; a map-based version would work but re-sorts what was already sorted and costs $O(n \log n)$.

## Approach
Compare the heads' exponents; take the bigger, or merge on a tie:

```cpp
while (a && b) {
    if (a->e > b->e) { append(a->c, a->e); a = a->next; }
    else if (b->e > a->e) { append(b->c, b->e); b = b->next; }
    else {                       // tie: sum, drop if zero
        long long s = (long long)a->c + b->c;
        if (s != 0) append(s, a->e);
        a = a->next; b = b->next;
    }
}
while (a) { append(a->c, a->e); a = a->next; }   // drain leftovers
while (b) { append(b->c, b->e); b = b->next; }
return dummy.next;   // null when everything cancelled -> EMPTY
```

where `append` is `tail->next = new Node{c, e}; tail = tail->next;`. The leftover drains need no zero-test: inputs have no zero coefficients, and a leftover node's exponent appears in only one list. Exponents reach $10^9$ and coefficients $10^9$ in absolute value, so a tie-sum can be $\pm 2 \cdot 10^9$ — beyond 32-bit int; accumulate in `long long` (Java `long`, C `long long`). JS `Number` is exact at this magnitude, but keep the discipline.

## Why it works
Invariant: the result chain holds the correct sum for every exponent strictly greater than both current heads' exponents, and `a`, `b` head their lists' untouched remainders. Because both inputs are descending and duplicate-free, at each step the larger head exponent cannot appear anywhere else — taking it is final; on a tie, the exponent appears exactly once in each list, so summing the two coefficients is the complete contribution, and a zero sum contributes nothing (dropped by not appending). The drains finish the remaining single-list terms, whose exponents are all smaller than everything already emitted, preserving descending order. The result is therefore the polynomial sum with all zero terms removed; if every term cancels, `dummy.next` is null → `EMPTY`.

## Complexity
$O(n_a + n_b)$ time — each head advances once per iteration; $O(1)$ extra space beyond the output nodes (or $O(n_a+n_b)$ counting the output). A hash map is $O(n)$ expected time but $O(n)$ space and needs a re-sort for descending output: $O(n \log n)$ — strictly worse here.

## Pitfalls
- 32-bit coefficient sums: $10^9 + 10^9 = 2 \cdot 10^9$ overflows signed int. `long long` for the sum (and the stored coefficient).
- Appending the zero-sum term instead of dropping it: `(3 2) + (-3 2)` must vanish, not print `0 2`.
- Forgetting the leftover drains: when one list ends, the other's remaining terms are all still needed.
- Wrong comparison direction: ascending-merge habit (`a->e < b->e`) prints ascending order; this problem is DESCENDING.
- Returning `dummy` instead of `dummy.next`, or printing a blank line instead of `EMPTY` when everything cancels.
- Mutating input nodes' `next` while still comparing them — appending with a tail pointer writes only the result tail's `next`; don't relink `a`/`b` nodes into the result or you destroy the walk.
