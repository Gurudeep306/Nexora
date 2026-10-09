## Intuition
"Intersection" means shared **memory** — from some node on, both chains run through the *same* nodes (a Y, not a crossing; equal values prove nothing). The lengths of the two stems differ, so a pointer per list started together will never be on the shared node at the same time... unless you make both routes the same length. The trick: when a pointer falls off the end, restart it at the *other* list's head. Each pointer then walks $a + b$ nodes before reaching the join, so they arrive in the same round and `p == q` fires exactly on the first shared node.

## Approach
```cpp
Node* p = headA, *q = headB;
while (p != q) {                 // pointer equality — identity, not value
    p = p ? p->next : headB;     // fell off A -> continue on B
    q = q ? q->next : headA;     // fell off B -> continue on A
}
return p;                        // shared node, or null if no intersection
```

Route bookkeeping: let A's stem have $a$ own nodes, B's stem $b$, the shared tail $c$. `p` covers $a$ (A's stem) then $b$ (B's stem) before touching the shared part; `q` covers $b$ then $a$ — both are at the join after exactly $a + b$ steps, so they meet there. If $c = 0$, both pointers reach `null` on the same step (each after $a + b + 1$ positions), the loop exits with `p == q == nullptr`, and the same code reports "none" with zero special cases.

For this problem the answer is the 0-based index of the meeting node along A: if the pointers met at a non-null node, that index is exactly $a$ (the number of A's own nodes) — but count it by walking A rather than trusting arithmetic, and print $-1$ when the meeting point is null. Degenerate stems need one guard: when $na = 0$ the shared head *is* A's head, so start `p` at `headA = ownA ? ownA : shared`.

## Why it works
Two invariants. (1) At any step $t$, `p` and `q` have each traversed exactly $t$ nodes of the concatenated route $A \to B$ resp. $B \to A$. (2) The first shared node sits at position $a + b$ on *both* routes (stem of the other list + own stem). Hence at $t = a + b$ both pointers are on the first shared node — the same object — and `p == q` exits with the answer. If there is no shared tail, position $a + b + 1$ is `null` on both routes simultaneously, and the loop exits on null equality. Termination: the loop always ends by step $a + b + 1$ at the latest — no infinite walk.

## Complexity
$O(na + nb)$ time — each pointer walks at most $na + nb + 1$ nodes. $O(1)$ space. Alternatives: count lengths and start the longer list's pointer $|na - nb|$ ahead (also $O(1)$ space, two passes), or hash A's node *addresses* into a set and walk B ($O(n)$ space). Comparing values instead of pointers is simply wrong.

## Pitfalls
- Comparing `p->v == q->v`: equal values are not shared memory; the Y can have decoy equal values in the stems.
- Loop condition `while (p && q && p != q)` plus post-loop null checks: works, but the null-meeting formulation above needs no cases at all.
- Restarting on the *same* list's head: infinite loop.
- Reporting the index along B, or 1-based: the spec wants the 0-based index along A — with the switch trick that is A's own-stem length, which equals the number of steps `p` took before the join... measure, don't guess.
- `nc = 0` means *no intersection* — output `-1`, not `0`.
