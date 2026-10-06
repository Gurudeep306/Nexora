## Intuition
Simulation cannot give an exact answer. Split the process into **phases** instead. Phase j starts when you have seen exactly j distinct faces, and ends at the next new face. During phase j every roll is new with the same probability $\frac{m-j}{m}$, so the phase length is geometric with mean $\frac{m}{m-j}$.

## Approach
By linearity of expectation over phases $j = 0, 1, \dots, c-1$:
$$\mathbb{E} = \sum_{j=0}^{c-1} \frac{m}{m-j} = m \left( H_m - H_{m-c} \right), \qquad H_x = \sum_{i=1}^{x} \frac1i.$$
1. Precompute the inverses $i^{-1} \bmod p$ for $i \le 10^6$ with the linear recurrence $i^{-1} = -\lfloor p/i \rfloor \cdot (p \bmod i)^{-1}$.
2. Precompute the prefix sums $H_x \bmod p$.
3. Answer each query in O(1): $m \cdot (H_m - H_{m-c}) \bmod p$.

Example: $m = 6$, $c = 2$. The first roll is always new, and the second phase takes $6/5$ rolls on average, so $\mathbb{E} = 1 + 6/5 = 11/5$. For $m = c = 6$: $6 H_6 = 6 \cdot \frac{49}{20} = 14.7$.

## Why it works
A geometric variable with success probability q has mean $1/q$. The total number of rolls is the sum of the c phase lengths, and expectation is linear. The phases need not be independent for this, although here they are. The recurrence for inverses comes from $p = \lfloor p/i \rfloor \cdot i + (p \bmod i)$. Reduce this modulo p and divide by $i \cdot (p \bmod i)$.

## Complexity
$O(N)$ precomputation with $N = 10^6$, then $O(1)$ per query.

## Pitfalls
- Without precomputation, summing $c$ terms per query is up to $10^{10}$ operations in total.
- Take $(H_m - H_{m-c})$ modulo p and keep it non-negative.
- $c = m$ is the classic coupon collector, with $H_0 = 0$.
