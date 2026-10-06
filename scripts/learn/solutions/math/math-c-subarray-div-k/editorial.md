## Intuition
There are $n(n+1)/2 \approx 2 \cdot 10^{10}$ subarrays. With prefix sums $P_0 = 0$ and $P_j = a_1 + \dots + a_j$, the subarray $(i, j]$ has sum $P_j - P_i$, and
$$k \mid P_j - P_i \iff P_i \equiv P_j \pmod k.$$
So we are counting pairs of prefix indices with **equal residues**.

## Approach
1. Compute $r_j = P_j \bmod k$ in $[0, k)$ for $j = 0..n$, with $r_0 = 0$.
2. Group equal residues. A group of size c contributes $\binom{c}{2}$ pairs. Use a hash map, or sort the residues and scan for runs.

Example: $k = 5$, $a = 4, 5, 0, -2, -3, 1$. The prefix residues are $0, 4, 4, 4, 2, 4, 0$. The groups are $\{0\}: 2$, $\{4\}: 4$ and $\{2\}: 1$, so the answer is $1 + 6 + 0 = 7$.

## Why it works
Each subarray $a_{i+1..j}$ with $0 \le i < j \le n$ corresponds to exactly one pair $(i, j)$, and it qualifies exactly when $r_i = r_j$. Counting unordered pairs of equal residues therefore counts the qualifying subarrays exactly once each. Keeping $r$ reduced is valid because $(P + x) \bmod k = ((P \bmod k) + x) \bmod k$.

## Complexity
$O(n)$ expected with a hash map, or $O(n \log n)$ with sorting. Memory is $O(n)$.

## Pitfalls
- **Negative remainders**: in C, C++, Java and JavaScript, `-3 % 5` is `-3`, which would not match residue 2. Normalise with `((x % k) + k) % k`.
- Do not forget $P_0 = 0$. Without it you miss every subarray that starts at index 1.
- The answer can reach about $2 \cdot 10^{10}$, which needs 64-bit. A raw prefix sum can reach $2 \cdot 10^{14}$, so reduce as you go, or use 64-bit sums.
