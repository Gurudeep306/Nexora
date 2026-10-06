## Intuition
A bracket string is a lattice path: `(` is a step up, `)` is a step down. Balanced means the path starts and ends at height 0 and never dips below it. Without the "never below 0" rule, there are $\binom{2n}{n}$ paths. The **reflection principle** counts the bad ones exactly, which avoids the $O(n^2)$ recurrence $C_{n+1} = \sum C_i C_{n-i}$.

## Approach
$$\text{Cat}_n = \binom{2n}{n} - \binom{2n}{n+1} = \frac{1}{n+1}\binom{2n}{n} = \frac{(2n)!}{n!\,(n+1)!}.$$
Precompute factorials and inverse factorials up to $2 \cdot 10^6 + 1$. Each query is $F[2n] \cdot \text{IF}[n] \cdot \text{IF}[n+1] \bmod p$.

Example: $n = 3$ gives $\frac{720}{6 \cdot 24} = 5$: `((()))`, `(()())`, `(())()`, `()(())`, `()()()`.

## Why it works
Take a bad path, one that reaches height $-1$, and reflect everything **after its first visit** to $-1$ across the line $y = -1$. The path ended at 0, so it now ends at $-2$: it has $n - 1$ ups and $n + 1$ downs. Conversely, every path with $n + 1$ downs ends at $-2$, so it must cross $-1$. Reflecting after its first visit there gives back a path ending at 0. These two maps undo each other, so the bad paths number $\binom{2n}{n+1}$. Then
$$\binom{2n}{n} - \binom{2n}{n+1} = \binom{2n}{n}\left(1 - \frac{n}{n+1}\right) = \frac{1}{n+1}\binom{2n}{n}.$$
Finally, $\frac{1}{n+1} \cdot \frac{1}{n!} = \frac{1}{(n+1)!}$, so no separate inverse is needed.

## Complexity
$O(N)$ preprocessing with $N = 2 \cdot 10^6$, and $O(1)$ per query.

## Pitfalls
- The table needs $2n$, which is $2 \cdot 10^6$, not $10^6$. It also needs index $n + 1$.
- $n = 0$: the empty string counts, so the answer is 1.
- Dividing the residue of $\binom{2n}{n}$ by $n + 1$ with integer division is wrong. Use the inverse factorial.
