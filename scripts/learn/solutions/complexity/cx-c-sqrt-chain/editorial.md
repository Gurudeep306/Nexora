## Intuition
If $n$ has $B$ bits, $\lfloor\sqrt n\rfloor$ has about $B/2$ bits. Halving the bit count repeatedly reaches 1 bit after about $\log_2 B = \log_2\log_2 n$ steps — the textbook $\Theta(\log\log n)$ loop. For $n \le 10^{18}$ ($B \le 60$) that is at most 6 steps, so simulation is perfectly fine. The real problem is computing $\lfloor\sqrt n\rfloor$ **exactly**.

## Approach
Simulate: while $n \ge 2$, set $n \leftarrow \operatorname{isqrt}(n)$ and count. Compute $\operatorname{isqrt}$ as
1. $r = \lfloor \texttt{sqrt}((\text{double})\,n)\rfloor$ — a guess, possibly off by one;
2. while $r^2 > n$: $r \mathrel{-}= 1$; while $(r+1)^2 \le n$: $r \mathrel{+}= 1$.

Example $n = 65536$: $65536 \to 256 \to 16 \to 4 \to 2 \to 1$, **5** steps.

## Why it works
After the corrections, $r^2 \le n < (r+1)^2$, which is the definition of $\lfloor\sqrt n\rfloor$. The double guess has relative error $\approx 2^{-53}$, so for $n < 2^{60}$ it is within 1 of the truth and each loop runs at most once or twice.

Step count: writing $n < 2^{2^j}$ implies $\sqrt n < 2^{2^{j-1}}$, so after $j$ steps the value is below $2^1$, i.e. $\le 1$. Hence at most $\lceil\log_2\log_2 (n+1)\rceil$ steps.

## Complexity
$O(\log\log n)$ iterations, each $O(1)$: about 6 per query.

## Pitfalls
- Precision: converting $n = (2^{32}-1)^2 - 1$ to double rounds it **up** to $(2^{32}-1)^2$, and `sqrt` returns $2^{32}-1$ — one too many. Always correct with integer checks.
- Overflow in the check: $(r+1)^2$ with $r \approx 10^9$ is $\approx 10^{18}$ — use 64-bit, never `int`.
- Stop condition is $n \ge 2$: $n = 1$ needs 0 steps, $n = 2, 3$ need 1.
- JavaScript: `Number(n)` already loses precision — do the correction in `BigInt`.
