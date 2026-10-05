## Intuition
Naively, $T(n)$ calls $T(n/2)$ and $T(n/3)$, giving a recursion tree with about $n^{0.79}$ nodes ($p$ solves $2^{-p} + 3^{-p} = 1$, $p \approx 0.788$) — around $10^{14}$ for $n = 10^{18}$. But the tree is full of repeats. Since $\lfloor \lfloor n/x \rfloor / y \rfloor = \lfloor n/(xy) \rfloor$, every argument ever reached is $\lfloor n / (2^i 3^j) \rfloor$. With $i \le 60$ and $j \le 38$ there are at most about 2400 **distinct** subproblems.

## Approach
Index subproblems by the pair $(i, j)$ instead of a hash map: let $v_{i,j} = \lfloor n/(2^i3^j) \rfloor$, computed as $v_{i,j} = \lfloor v_{i-1,j}/2 \rfloor$ (or $\lfloor v_{i,j-1}/3 \rfloor$). Then fill a table backwards:
$$D_{i,j} = \begin{cases} 0 & v_{i,j} = 0 \\ D_{i+1,j} + D_{i,j+1} + 1 & \text{otherwise}\end{cases}$$
for $i$ from 61 down to 0 and $j$ from 39 down to 0. The answer is $D_{0,0}$. (A hash-map memo keyed by the value works too; different $(i,j)$ can share a value, which the grid simply recomputes — harmless.)

Example n = 6: $T(1) = T(0) + T(0) + 1 = 1$, $T(2) = T(1) + T(0) + 1 = 2$, $T(3) = T(1) + T(1) + 1 = 3$, $T(6) = T(3) + T(2) + 1 = $ **6**.

## Why it works
$D_{i,j}$ equals $T(v_{i,j})$ by induction on decreasing $(i, j)$: $\lfloor v_{i,j}/2 \rfloor = v_{i+1,j}$ and $\lfloor v_{i,j}/3 \rfloor = v_{i,j+1}$ by the nested-floor identity. Cells beyond the grid have $v = 0$ because $2^{61} > 10^{18}$ and $3^{39} > 10^{18}$.

## Complexity
$O(\log_2 n \cdot \log_3 n) \approx 2400$ cells per query: the lesson is that memoisation turns an exponential-looking recursion tree into a count of **distinct** arguments, here $O(\log^2 n)$.

## Pitfalls
- Plain recursion without memo times out; recursion **with** memo is fine depth-wise (depth $\le 60$), but the table is simpler.
- Answers reach $\sim 10^{14}$ and n reaches $10^{18}$: 64-bit integers; in JS divide with BigInt.
- Never compute $2^i3^j$ directly — it overflows; divide successively instead.
