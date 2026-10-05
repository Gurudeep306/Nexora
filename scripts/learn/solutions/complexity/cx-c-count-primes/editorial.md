## Intuition
Answering each query by trial division costs $O(n\sqrt n)$ per query in the worst case — hopeless for $10^5$ queries up to $5\cdot10^6$. When many queries share one small universe, **precompute once**: sieve every number up to $N = \max n$, build prefix counts $\pi(x)$, and answer each query by a table lookup.

## Approach
1. Read all queries; let $N$ be the largest.
2. Sieve of Eratosthenes on $[0, N]$: for each $i$ with $i^2 \le N$ that is still marked prime, unmark $i^2, i^2+i, \dots$.
3. Prefix sums: $\pi(x) = \pi(x-1) + [x \text{ prime}]$.
4. Print $\pi(n)$ for each query.

Example: up to 10 the primes are 2, 3, 5, 7, so $\pi(1)=0$, $\pi(2)=1$, $\pi(10)=$ **4**, $\pi(100) = 25$.

## Why it works
A composite $x$ has a prime factor $q \le \sqrt x$, and it is unmarked when the sieve processes $q$ (since $x \ge q^2$ is a multiple of $q$). Primes are never unmarked because every number we cross out is a proper multiple of something. Starting at $i^2$ is safe: smaller multiples $ji$ with $j < i$ were already removed by a prime factor of $j$.

## Complexity
The sieve does $\sum_{q \le N,\ q \text{ prime}} N/q = O(N\log\log N)$ work (Mertens), the prefix pass $O(N)$, and each query $O(1)$: total $O(N\log\log N + T)$ — about $1.2\cdot10^7$ simple operations, compared with $\approx 10^{11}$ for per-query trial division.

## Pitfalls
- $0$ and $1$ are not prime — mark them before the prefix pass.
- $i \cdot i$ overflows 32-bit only for $i > 46340$; here $i \le 2237$, but loop on `i * i <= N` rather than `i <= sqrt(N)` to avoid float issues.
- Use a byte/boolean array, not an `int` per entry, to keep memory low; in Python, slice-assign whole progressions instead of looping per element.
- Build output in one buffer — $10^5$ separate prints is slow.
