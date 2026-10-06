## Intuition
Two congruences either merge into **one** congruence modulo their lcm or contradict each other (see *Two congruences*). So fold them: keep the combined state "$x \equiv X \pmod M$" and absorb the congruences one at a time. The classic CRT product formula needs pairwise coprime moduli. Folding does not.

## Approach
Start with $X = 0, M = 1$ (every integer). For each $(a, m)$:
1. $g = \gcd(M, m)$, $d = (a - X) \bmod m$. If $g \nmid d$, print $-1$.
2. $m' = m/g$ and $k = \frac dg \cdot (M/g)^{-1} \bmod m'$, the inverse taken modulo $m'$.
3. $X \leftarrow X + M k$ and $M \leftarrow (M/g) \cdot m$.

Print $X$ at the end.

Example: $(1, 4), (3, 6), (7, 10)$. First $X = 1, M = 4$. Merging $(3, 6)$ gives $X = 9, M = 12$. For $(7, 10)$: $g = 2$, $d = (7 - 9) \bmod 10 = 8$, and $6k \equiv 4 \pmod 5$ gives $k = 4$. So $X = 9 + 48 = 57$ and $M = 60$. Check: $57 \bmod 4 = 1$, $57 \bmod 6 = 3$, $57 \bmod 10 = 7$.

## Why it works
Invariant: after processing a prefix, its solution set is exactly $\{x : x \equiv X \pmod M\}$, with $0 \le X < M = \operatorname{lcm}$ of the prefix. Initially $M = 1$. A merge step intersects this class with $x \equiv a \pmod m$. Writing $x = X + Mk$ reduces it to $Mk \equiv d \pmod m$, which is solvable iff $g \mid d$ and then has a unique $k \bmod m'$. The new solution set is one class modulo $M m' = \operatorname{lcm}(M, m)$, and $X + Mk \le (M - 1) + M(m' - 1) < M m'$, so the representative stays canonical. If any step is unsolvable, the whole system is.

## Complexity
$O(n \log m)$ time and $O(1)$ memory.

## Pitfalls
- Overflow: $M \le 10^{18}$ is guaranteed, so compute $M k < M m' \le 10^{18}$, never $M \cdot m$ before dividing by $g$. Reduce $M/g$ modulo $m'$ before inverting, and reduce $X$ modulo $m$ before subtracting.
- In JavaScript, $X$ and $M$ need `BigInt`.
- Keep reading input after an inconsistency is found, or return early cleanly.
- $m = 1$ congruences are harmless: $m' = 1$ and $k = 0$.
