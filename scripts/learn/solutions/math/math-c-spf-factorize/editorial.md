## Intuition
Trial division costs up to $\sqrt{x} = 1000$ steps per query, and many queries repeat that work. A sieve can record, for every $v \le 10^6$, its **smallest prime factor** $\mathrm{spf}[v]$. Then factoring is a walk: $x \to x / \mathrm{spf}[x] \to \dots \to 1$. Each step removes a prime factor, so there are at most $\log_2 x \approx 20$ steps.

## Approach
1. Set $\mathrm{spf}[v] = 0$ (unknown) for all $v$. For $p = 2, 3, \dots$: if $\mathrm{spf}[p] = 0$, then $p$ is prime, so set $\mathrm{spf}[p] = p$ and, for every multiple $j$ of $p$ starting at $p^2$ with $\mathrm{spf}[j] = 0$, set $\mathrm{spf}[j] = p$.
2. For a query $x$, while $x > 1$: print $\mathrm{spf}[x]$ and set $x \leftarrow x / \mathrm{spf}[x]$.

Example: $360$. The smallest factors along the walk are $2$ ($\to 180$), $2$ ($\to 90$), $2$ ($\to 45$), $3$ ($\to 15$), $3$ ($\to 5$) and $5$ ($\to 1$). Output: `2 2 2 3 3 5`.

## Why it works
Primes are processed in increasing order, and a value is written only while it is still 0, so the first prime to reach a composite $j$ is its smallest prime factor. Every composite $j$ is reached, because its smallest prime $p$ satisfies $p^2 \le j$. In the walk, $\mathrm{spf}[x]$ is a prime dividing $x$, and it is $\le$ every other prime factor of $x$. So the printed primes are non-decreasing and multiply to the original $x$.

## Complexity
The sieve is $O(N \log \log N)$ for $N = 10^6$. A query is $O(\log x)$. Total: $O(N \log \log N + Q \log N)$ time and $O(N)$ memory. Trial division would be $O(Q\sqrt{N}) = 10^8$.

## Pitfalls
- Start the inner loop at $p^2$ in 64-bit, or guard against overflow.
- Primes $x$ itself: $\mathrm{spf}[x] = x$, so the output is just `x`.
- Output is up to ~20 numbers per line. Build it in a buffer.
