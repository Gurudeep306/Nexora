## Intuition
Two pointers leave head together; `fast` moves two nodes per round, `slow` one. Fast's index is always exactly twice slow's, so when fast can no longer take a double step, slow stands at the halfway mark. Say which middle your guard produces BEFORE you code — that one sentence is the credibility move: with both pointers at head and the guard `while (fast && fast.next)`, you get the **second** of the two middles on even n ($[1,2,3,4] \to 3$). The two-pass version (count, then walk $\lfloor n/2 \rfloor$) is the same big-O but needs the length first — impossible when the nodes arrive as a stream you cannot re-read.

## Approach
```cpp
Node* slow = head;
Node* fast = head;
while (fast && fast->next) {   // fast can still take a double step
    slow = slow->next;         // 1 step
    fast = fast->next->next;   // 2 steps
}
return slow->v;                // second middle on even n
```
Trace $[1,2,3,4]$: start both at index 0; round 1 → slow 1, fast 2; round 2 → slow 2, fast 4 (null) — loop ends, slow sits on value 3. On odd n $[1,2,3,4,5]$: slow 1/fast 2, slow 2/fast 4, fast->next is null — slow at index 2, value 3, the unique middle.

## Why it works
Invariant: after $r$ rounds, $\text{index}(fast) = 2r$ and $\text{index}(slow) = r$ (indices of live nodes; fast may be null, meaning it stepped off at position $2r$). The loop stops the first time fast cannot double-step: either fast is null ($2r = n$, even n) or fast->next is null ($2r = n-1$, odd n). In both cases $r = \lfloor n/2 \rfloor$, and node $\lfloor n/2 \rfloor$ is by definition the second middle on even n and the unique middle on odd n. The guard evaluates `fast` before `fast->next`, so short-circuiting makes every dereference safe.

## Complexity
$O(n)$ time — fast touches each node at most once, so about $n/2$ rounds. $O(1)$ space — two pointers. One pass, unlike count-then-walk.

## Pitfalls
- Starting `fast` at `head->next` instead of `head` silently switches you to the FIRST middle on even n. Both are legitimate answers to "the middle" — the guard and the start decide which; mismatches with the spec are pure off-by-one.
- Guard `while (fast->next && fast->next->next)` also yields the first middle — fine for "node before the second half" (palindrome/split), wrong here.
- Order in the guard matters: `while (fast->next && fast)` dereferences null on the last round.
- Empty list: this problem guarantees $n \ge 1$, but the same loop on $n = 0$ returns a null `slow` — check before dereferencing in reusable code.
- Printing the middle *onward* (slow to tail) when the spec asks for the single middle value.
