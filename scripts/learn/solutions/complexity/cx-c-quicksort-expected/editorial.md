## Intuition
Do not try to solve the recurrence $C(n) = n - 1 + \frac{1}{n}\sum_k \big(C(k-1) + C(n-k)\big)$ head-on. Use **indicator variables**: the total number of comparisons is the sum, over all pairs of values, of "were these two ever compared?". Linearity of expectation turns the expected total into a sum of probabilities.

## Approach
Name the values by rank $1..n$. Ranks $i < j$ are compared **iff** the first pivot chosen among ranks $i, i+1, \dots, j$ is $i$ or $j$. All $j-i+1$ of them are equally likely to be that first pivot, so
$$\Pr[i \text{ vs } j] = \frac{2}{j-i+1}.$$
Group by the gap $d = j - i$ (there are $n-d$ such pairs) and put $k = d + 1$:
$$E = \sum_{k=2}^{n} \frac{2(n+1-k)}{k} = 2(n+1)(H_n - 1) - 2(n-1) = 2(n+1)H_n - 4n.$$
Precompute $\text{inv}[i]$ for $i \le 10^6$ with $\text{inv}[i] = -\lfloor p/i\rfloor \cdot \text{inv}[p \bmod i]$, prefix-sum them into $H_n \bmod p$, and answer each query in $O(1)$.

Example n = 3: $2\cdot4\cdot\frac{11}{6} - 12 = \frac{8}{3}$. Check: the middle pivot costs 2 comparisons, an extreme one 2 + 1 = 3, so $\frac13\cdot2 + \frac23\cdot3 = \frac83$.

## Why it works
Until a pivot from $\{i..j\}$ is chosen, all of $i..j$ stay in the same subarray. If that pivot is $i$ or $j$, it is compared with the other; if it lies strictly between, $i$ and $j$ are split into different subarrays and never meet. Elements are only ever compared with a pivot, so each pair is compared at most once.

## Complexity
$O(N)$ precomputation with $N = \max n \le 10^6$, then $O(1)$ per query. The expectation itself is $\approx 2n\ln n = O(n\log n)$.

## Pitfalls
- $2(n+1)H_n - 4n$ is a residue: subtract $4n$ and add $p$ before the final reduction so it stays non-negative.
- The inverse recurrence multiplies two numbers below $p$: about $10^{18}$, so 64-bit in C/Java, and a split multiplication (or BigInt) in JavaScript, where $2^{53}$ is the exact limit.
- Calling Fermat's $Q^{p-2}$ for every $i$ costs $O(N\log p)$ — fine, but the linear recurrence is simpler and faster.
