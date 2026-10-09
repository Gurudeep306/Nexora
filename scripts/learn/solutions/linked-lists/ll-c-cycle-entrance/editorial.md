## Intuition
A cycle means "the tail's `next` points back to an earlier node". Detection must compare NODES (addresses), never values — two equal values are not the same node. Floyd's tortoise-and-hare finds a meeting point inside the cycle in $O(1)$ space; the magic is phase two: restart one pointer at head and walk BOTH one step per round — they meet exactly at the entrance. The hash-set method (record every visited node, first repeat is the entrance) is also correct but pays $O(n)$ memory; say both costs in an interview.

## Approach
```cpp
// Phase 1: detect. tortoise 1 step, hare 2.
Node* slow = head;
Node* fast = head;
while (fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
    if (slow == fast) break;              // met inside the cycle
}
if (!fast || !fast->next) return -1;      // hare fell off the end: no cycle

// Phase 2: entrance. one pointer back to head, both walk 1 step.
Node* p = head;
while (p != slow) {
    p = p->next;
    slow = slow->next;
}
return p;                                 // the entrance NODE
```
To report the 0-based index, compare the entrance node against the nodes in build order (an array kept purely for I/O convenience) — or walk from head counting until you reach it, which is safe now because you know it's reachable without looping forever.

## Why it works
Phase 1: once both pointers are inside the cycle, think of the hare chasing the tortoise on a ring of length $C$ — the gap shrinks by exactly 1 per round (2 steps vs 1), so it hits 0 within $C$ rounds: they MUST meet. If instead the hare reaches null, the list simply ends: no cycle. Phase 2: let $L$ = distance head→entrance, $m$ = distance entrance→meeting point (along `next`), $C$ = cycle length. The hare ran twice the tortoise's distance, giving $L + m \equiv 0 \pmod{C}$ up to whole laps — precisely, $L = jC - m$ for some integer $j \ge 1$. So walking $L$ steps from the meeting point moves $-m$ (back to the entrance) plus $j$ full laps (which land you back on the entrance). Walking $L$ steps from head lands on the entrance too. Both pointers, same speed, arrive simultaneously.

## Complexity
$O(n)$ time — phase 1 meets within $O(L + C)$ rounds, phase 2 within $L$ rounds. $O(1)$ space. The hash-set alternative is $O(n)$ time and $O(n)$ space.

## Pitfalls
- Comparing VALUES instead of node identity: `[1,1]` with no cycle would "detect" one; `[1,2,1]` with a cycle might report the wrong node.
- Phase 2 moving one pointer 2 steps, or forgetting to restart at head: the meeting point is generally NOT the entrance.
- Loop guard: `while (fast && fast->next)` is the safe canonical form; any variant must null-check before EVERY double dereference, or an acyclic list crashes the detector.
- Breaking out of phase 1 without distinguishing "met" from "fell off": you must re-check `fast`/`fast->next` after the loop, otherwise an acyclic list continues into phase 2 and walks off the end.
- Printing the meeting point as the answer, or 1-based indices when the spec says 0-based.
- Building the cycle wrongly while parsing: link the TAIL to the pos-th node; pos = −1 means leave `tail->next = NULL`.
