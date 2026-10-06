## Intuition
Looping over all $x \le 10^{18}$ is impossible, but counting the multiples of a single number is just $\lfloor n/a \rfloor$. The trouble is double counting: a multiple of both $a_1$ and $a_2$ is a multiple of $\operatorname{lcm}(a_1, a_2)$. Inclusion–exclusion fixes this by alternately adding and subtracting over all $2^k - 1$ non-empty subsets, and $2^{16}$ is small.

## Approach
Run a DFS that decides, for each $a_i$, whether it joins the subset, carrying $L$, the lcm so far, and the subset size.
1. Leaf (all k decided): if the subset is non-empty, add $\lfloor n/L \rfloor$ for odd size and subtract it for even size.
2. Including $a_i$ gives $L' = \frac{L}{\gcd(L, a_i)} \cdot a_i$. **Prune** when $L' > n$: every superset has an lcm at least $L'$ and contributes $\lfloor n/L'' \rfloor = 0$.
3. To test $L' > n$ without overflow, compare $x = L / \gcd(L, a_i)$ with $\lfloor n / a_i \rfloor$: $x \cdot a_i > n \iff x > \lfloor n/a_i \rfloor$.

Example: $n = 100$, $a = (4, 6, 10)$:
$(25 + 16 + 10) - (8 + 5 + 3) + 1 = 36$, using lcms 12, 20, 30 and 60.

## Why it works
For sets $A_i$ of multiples of $a_i$, $\bigcap_{i \in S} A_i$ is the set of multiples of $\operatorname{lcm}(S)$, and the inclusion–exclusion formula gives $|\bigcup A_i|$ exactly. Pruned subsets contribute exactly 0, so skipping them changes nothing. The overflow test is exact because for positive integers, $x \cdot a > n \iff x > \lfloor n/a \rfloor$.

## Complexity
At most $2^{k+1}$ DFS nodes, each with one gcd of $O(\log n)$ steps: $O(2^k \log n)$. Large $a_i$ prune the tree early. Memory is $O(k)$.

## Pitfalls
- Computing $\operatorname{lcm}$ as $L \cdot a / \gcd$ overflows even when the result fits. Divide first, then compare before multiplying.
- Values may repeat, and $a_i = 1$ is allowed. The formula handles both.
- In JavaScript, use `BigInt`, because $10^{18} > 2^{53}$.
