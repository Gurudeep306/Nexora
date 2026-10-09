## Intuition
Union of two sorted lists is two templates you already own, composed: the stable MERGE-WALK (compare heads, take the smaller) with DEDUP folded in. The dedup rule is a single test: append a taken node to the result only when its value differs from the result's current tail. That one test kills duplicates WITHIN a list, ACROSS lists, and in the leftover remainder alike. No set, no sort — one pass over both lists, $O(1)$ space.

## Approach
```cpp
Node dummy{0, nullptr};
Node* tail = &dummy;
auto take = [&](int v) {
    if (tail != &dummy && tail->v == v) return;   // dedup vs result tail
    tail->next = new Node{v, nullptr};
    tail = tail->next;
};
Node *a = headA, *b = headB;
while (a && b) {
    if (a->v <= b->v) { take(a->v); a = a->next; }
    else              { take(b->v); b = b->next; }
}
while (a) { take(a->v); a = a->next; }
while (b) { take(b->v); b = b->next; }
return dummy.next;   // null iff both lists empty -> EMPTY
```

The dedup guard needs the `tail != &dummy` check: before the first append the tail IS the dummy and its value is meaningless — the first node must always go in. (Equivalently, initialise a `last` sentinel that cannot equal any real value.) Since values are appended in non-decreasing order, "differs from the result's tail" is equivalent to "differs from every value already appended" — comparing against the tail alone suffices.

## Why it works
Invariant: the result holds the union of everything consumed so far, strictly increasing, and `a`, `b` head the untouched sorted remainders. The merge-walk always takes the smallest live head, so values are appended in non-decreasing order — which makes the last-appended value the maximum of the result, so a new value duplicates something already present iff it equals the tail. The `<=` tie-break takes A's copy first on equal heads, but the dedup drops B's copy immediately after, so ties across lists produce exactly one node. The drains inherit the same guarantee. Every distinct value present in either list is taken at least once (it eventually becomes a head) and appended at most once (later copies equal the tail and are dropped) — the result is exactly the distinct-value union, in increasing order. Both lists empty → nothing appended → `dummy.next == null` → `EMPTY`.

## Complexity
$O(n_a + n_b)$ time — each head advances once per iteration; $O(1)$ extra space beyond the output. A hash set is $O(n)$ expected but $O(n)$ space and loses the sorted order (needs a re-sort: $O(n \log n)$).

## Pitfalls
- Deduping against the INPUT head instead of the RESULT tail: misses cross-list duplicates that arrive non-adjacently in the walk.
- Comparing against the dummy without guarding: the dummy's value (0) can equal a real 0 in the data and wrongly drop the first node.
- `<` instead of `<=` in the comparison: still correct for union (either copy works) but worth knowing that on ties you then take B first — the dedup makes the choice immaterial. Don't "fix" it into a bug.
- Forgetting the leftover drains: the longer list's remainder is part of the union.
- Printing a blank line instead of `EMPTY` when both lists are empty.
