# ll-c-insert-circular — Insert into a sorted circular list

## Intuition
The ring was sorted, then rotated, then handed to you at an arbitrary node H — so you never see "the beginning." There is no null to stop at, either: a ring walk must stop by **identity** (`a->next == H`) or a **counter**, never a null test. And because the start is arbitrary, the answer needs a tie-breaking rule to be unique; this problem fixes one: walk ONE lap from H and insert into the FIRST pair that qualifies.

What does "qualifies" mean? A sorted ring has exactly one **seam** — the adjacent pair where the maximum meets the minimum ($a > b$). Everywhere else $a \le b$ and x fits between them when $a \le x \le b$. At the seam, "between max and min" wraps around: x belongs there if it is the new maximum ($x \ge a$) or the new minimum ($x \le b$). Those two seam clauses cover both extremes at once.

## Approach
```cpp
Node* a = H;
bool done = false;
for (int step = 0; step < n && !done; step++) {   // counter stop, NOT null
    Node* b = a->next;
    bool seam = a->v > b->v;
    if ((a->v <= x && x <= b->v) || (seam && (x >= a->v || x <= b->v))) {
        nd->next = b;
        a->next = nd;                              // two writes, ring stays closed
        done = true;
    }
    a = b;
}
if (!done) {                                       // no pair qualified:
    nd->next = H->next;                            // all values are equal
    H->next = nd;                                  // -> insert right after H
}
```

The loop visits pairs $(v_1,v_2), (v_2,v_3), \dots, (v_n, v_1)$ — the last one is the **wrap-around pair** (last node, H), and it is reached at step n−1 only because the counter allows n steps. The splice is the usual two writes; since both `a` and `b` were already wired, the ring never opens.

Edge cases the rule absorbs: n = 0 → print x alone (a one-node ring); n = 1 → the only pair is (H, H): if $x = H$ it qualifies ($H \le x \le H$) and lands after H; if x differs, no pair qualifies and the fallback also lands after H — either way `[H, x]`, which the fixtures pin down (`5` + x=4 → `5 4`).

## Why it works
The input is a rotation of a non-decreasing sequence, so exactly one of two shapes holds. (1) Some adjacent pair has $a > b$ — the seam. Then all pairs before the seam are flat ($a \le b$) and all pairs after are flat too; the first pair satisfying $a \le x \le b$ is where x belongs in the underlying sorted order, and if none does, x is outside $[\min, \max]$ and the seam clause fires on the unique seam pair, correctly placing the new max (just before min... after the max) or new min (just before the min). (2) No pair has $a > b$ — all n values are equal. Then $a \le x \le b$ fires iff $x$ equals that value (first such pair wins, deterministic), and if x differs, nothing qualifies and the fallback inserts after H. In every branch exactly one insertion point is chosen, first-qualifying in lap order — which is precisely the uniqueness rule the statement demands, and the fixtures pin it down (e.g. all-sevens ring with x = 7 inserts after H).

## Complexity
$O(n)$ time — one lap, constant work per pair. $O(1)$ space beyond the ring. The splice itself is two writes, as always.

## Pitfalls
- Stopping the walk with a null test: the ring has no null — infinite loop. Stop by counter (as here) or by `b == H` identity AFTER processing the wrap pair.
- Forgetting the wrap-around pair: x that is the new max/min only qualifies at (last, H). Skipping it leaves "no pair qualified" and the fallback misplaces the value.
- Seam condition `a >= b` instead of `a > b`: on flat equal pairs you'd treat them as seams and accept any x there, breaking the all-equal and duplicate-heavy cases (the fixture with 20000 sevens exists exactly for this).
- Inserting before the qualifier instead of after: the splice goes between `a` and `b` — `nd->next = b; a->next = nd;`. Reversed writes open the ring.
- Continuing the lap after inserting: without the `done` flag you may splice a second time (a later pair can also satisfy $a \le x \le b$ when values repeat) — the rule is FIRST qualifying pair only.
- Printing with a null-terminated loop: output must print exactly n+1 values starting at H — count them, don't wait for a null that never comes.
- n = 0: there is no H; guard before closing the ring (dereferencing tail would be a null crash).
