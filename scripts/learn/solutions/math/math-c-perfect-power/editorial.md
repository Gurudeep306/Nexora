## Intuition
If $n = a^k$ with $a \ge 2$, then $k \le \log_2 n < 60$. So only 59 exponents need checking, and for each one there is exactly one candidate base: the integer k-th root $r = \lfloor n^{1/k} \rfloor$. The real difficulty is **computing that root exactly**. A double has a 53-bit mantissa, so `pow(n, 1.0/k)` can be off by one in either direction near $10^{18}$, and a naive $r^k$ can overflow.

## Approach
For $k = 59, 58, \dots, 2$:
1. Get an estimate $r = \operatorname{round}(n^{1/k})$ in floating point.
2. Fix it with exact integer arithmetic: while $r^k > n$, decrease r, and while $(r+1)^k \le n$, increase r.
3. If $r \ge 2$ and $r^k = n$, print `r k` and stop. Otherwise, after the loop, print `n 1`.

Compute $r^k$ with a **capped** multiplication: before multiplying `p *= r`, check `p > n / r`, and if so stop and report "greater than n". In JavaScript, use `BigInt`.

Example: $n = 64$. The check $k = 6$ finds $r = 2$, so the output is `2 6`, even though $64 = 4^3 = 8^2$ too. For $n = 999999998000000001 = 999999999^2$, the float root of this 18-digit number may come out as $10^9$, and the correction step fixes it.

## Why it works
For a fixed k, the map $r \mapsto r^k$ is strictly increasing, so at most one integer r satisfies $r^k = n$, namely $\lfloor n^{1/k} \rfloor$. The two correction loops end exactly at that floor. The estimate is within a few units, so they take O(1) steps. Scanning k downward returns the largest valid exponent first. The capped product never overflows, because we only multiply when $p \le \lfloor n/r \rfloor$, which means $p \cdot r \le n$.

## Complexity
$O(60 \cdot 60)$ multiplications per query in the worst case, so about $4 \cdot 10^6$ for $T = 1000$.

## Pitfalls
- Trusting `pow` or `sqrt` without correction fails on numbers like $10^{18} - 1$ and squares near $10^{18}$.
- Overflow in $r^k$ makes a too-large r look valid. Always cap.
- Searching k upward and stopping at the first hit gives the wrong (smallest) exponent.
