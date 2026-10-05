## Intuition
A single `multipop k` may remove the whole stack — up to $\Theta(q)$ work — so "q operations, each $O(q)$" suggests $O(q^2)$. That bound is loose. An element can only be popped once, and only after it was pushed. So the total number of pops over the whole run is at most the number of pushes, which is at most q.

## Approach
Simulate literally with an array-backed stack. For `1 x` push x. For `2 k`, pop $\min(k, \text{size})$ elements, adding them to a running sum, and print the sum. Simulating is fine — we never loop k times when the stack is shorter, only $\min(k, \text{size})$ times.

Example: push 5, 3, 7; `2 2` pops 7 and 3 → **10**; push 1; `2 10` pops 1 and 5 → **6**.

## Why it works
Correctness is just the definition of the stack. For the running time use the aggregate method: let P be the number of pushes. Each iteration of a pop loop removes one element that was pushed earlier and is never seen again, so the total number of pop iterations across all multipops is $\le P \le q$. Adding the $O(1)$ overhead per operation, the whole sequence costs $O(q)$ — amortized $O(1)$ per operation. (Potential method view: $\Phi$ = stack size; a push costs 1 + 1, a multipop of m elements costs $m - m = 0$ amortized.)

## Complexity
$O(q)$ time, $O(q)$ memory.

## Pitfalls
- Do not loop k times: k is up to $10^9$; loop $\min(k, \text{size})$ times.
- A popped sum can reach $2\cdot10^5 \cdot 10^9 = 2\cdot10^{14}$: use 64-bit integers (still below $2^{53}$, so JS Numbers are exact).
- Multipop on an empty stack prints 0, it is not an error.
