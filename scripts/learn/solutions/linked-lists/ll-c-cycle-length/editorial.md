## Intuition
"How long is the cycle?" is the standard follow-up after "does it cycle?" and "where does it start?" — and all three acts share ONE detection pass. Act one is Floyd: tortoise 1 step, hare 2, until they meet (or the hare falls off the end — acyclic, answer 0). Act two is the lap count: FREEZE one pointer at the meeting node and walk the other one step at a time until it comes BACK to the frozen node. Inside a cycle, "returning to a fixed node" means exactly one full lap — so the step count is the cycle length $C$. No visited set, no arithmetic on indices, $O(1)$ space.

## Approach
```cpp
// Act 1: Floyd detect
Node* slow = head;
Node* fast = head;
bool met = false;
while (fast && fast->next) {
    slow = slow->next;
    fast = fast->next->next;
    if (slow == fast) { met = true; break; }
}
if (!met) return 0;                 // acyclic

// Act 2: freeze `slow`, walk `p` around until it returns
Node* p = slow->next;
int C = 1;
while (p != slow) {
    p = p->next;
    C++;
}
return C;
```
Start `p` at `slow->next` with $C = 1$ already counted — starting at `slow` with $C = 0$ and a do/while is the same thing; starting at `slow` with $C = 0$ and a plain while loop returns 0, the classic bug.

## Why it works
Act 1: once both pointers are in the cycle the gap closes by exactly 1 per round, so they meet within $C$ rounds; a hare that reaches null proves there is no cycle at all. Act 2: the meeting node lies ON the cycle, and every node of a cycle is on one simple ring — following `next` from any ring node visits each ring node exactly once before returning to the start. Hence the number of steps until "back at the frozen node" equals the number of nodes on the ring, which is $C$. (Bonus identity from the entrance analysis: $C = n - L$ where $L$ is the head→entrance distance, so act 2 also equals "count nodes minus walk to entrance" — but the lap walk needs no extra bookkeeping.)

## Complexity
$O(n)$ time — detection is $O(L + C)$, the lap is $O(C)$, and $L + C \le n$. $O(1)$ space. A visited-set solution is $O(n)$ time but $O(n)$ space.

## Pitfalls
- Starting the lap at the meeting node with a plain `while (p != slow)` and $C = 0$: the condition is false immediately, answer 0. Use do/while, or pre-step (`p = slow->next; C = 1`).
- Counting from head to the meeting point — that's $L + m$, not $C$.
- Comparing values instead of node pointers: `[1,1,1]` acyclic would fake a cycle.
- Forgetting the acyclic branch: with pos = −1 the expected answer is 0, and skipping act 1's null check makes act 2 dereference null.
- Building the test list wrong: the TAIL links to the pos-th node; pos = −1 leaves the tail's `next` null.
- Off-by-one in the lap: `C` must count NODES on the ring, including the frozen one.
