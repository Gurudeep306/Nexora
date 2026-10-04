## Intuition
Applying each update element by element costs $O(r-l+1)$, up to $O(nm) = 4\cdot10^{10}$. A **difference array** records each update in just two cells: "+v starts at l" and "−v stops after r". One prefix-sum pass at the end turns these markers into the actual additions.

## Approach
`D` of length n+1, all zeros. For each update: `D[l] += v`, `D[r+1] -= v`. Then sweep: `run += D[i]`, and output `a[i] + run`.

Example (n = 6, zeros): update (1,3,+3) → D = 0 3 0 0 −3 0 0; update (2,5,+2) → D = 0 3 2 0 −3 0 −2. Running sums: 0 3 5 5 2 2 → answer `0 3 5 5 2 2`.

## Why it works
After the sweep, `run` at index i equals $\sum_{j \le i} D[j]$. An update (l, r, v) contributes +v to that sum exactly when $l \le i$ and cancels it with −v when $r+1 \le i$, i.e. it contributes v precisely for $l \le i \le r$. Sums of contributions are independent, so all updates combine correctly.

## Complexity
$O(1)$ per update, $O(n)$ sweep: $O(n + m)$. Space $O(n)$.

## Pitfalls
- D needs n+1 cells (r+1 can be n).
- Totals can reach $2\cdot10^{11}$ plus the initial value: use 64-bit.
