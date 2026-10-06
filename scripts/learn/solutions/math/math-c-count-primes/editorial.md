## Intuition
Testing each number up to n by trial division costs about $n\sqrt{n}$ per query, and there may be $10^5$ queries. Every query asks about the **same** fixed set of primes, though. So find all of them once, up to the largest possible n, and turn "how many primes are $\le n$" into a table lookup.

## Approach
1. Run the sieve of Eratosthenes up to $N = 5 \cdot 10^6$. Start with every number marked prime. For each $p$ with $p^2 \le N$ that is still marked, cross out $p^2, p^2 + p, p^2 + 2p, \dots$
2. Build the prefix count $\pi[v] = \pi[v-1] + [v \text{ is prime}]$.
3. Answer each query with $\pi[n]$.

Example: the primes up to 10 are 2, 3, 5 and 7, so $\pi[10] = 4$, $\pi[1] = 0$, and $\pi[100] = 25$.

## Why it works
A composite $v$ has a prime factor $p \le \sqrt{v}$, and $v \ge p^2$ is a multiple of $p$, so it gets crossed out when $p$ is processed. Crossing can start at $p^2$ because any smaller multiple $kp$ with $k < p$ has a prime factor below $p$ and was already crossed. A prime is never a proper multiple of anything, so it stays marked. The prefix array then counts the marked values in $[2, n]$ by induction on $n$.

## Complexity
The sieve does $\sum_{p \le N} N/p = O(N \log \log N)$ work and the prefix pass is $O(N)$. Each query is $O(1)$. Memory is $O(N)$: bytes for the flags, plus an int array for the prefix counts. The Python solution avoids the 5-million-entry prefix list by sorting the queries and counting flags between consecutive ones with `bytearray.count`.

## Pitfalls
- 0 and 1 are **not** prime, so $\pi[1] = 0$.
- Use `p * p <= N` (or 64-bit) in the outer loop condition.
- Reading $10^5$ lines one by one with slow I/O can dominate the runtime. Read everything at once.
