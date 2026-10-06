## Intuition
Walking from L to R and testing `x % k == 0` takes up to $2 \cdot 10^{18}$ steps. Counting multiples is easier from a fixed origin. The multiples of k in $(-\infty, X]$ are $\dots, -k, 0, k, \dots, \lfloor X/k \rfloor k$. Measured against 0, there are $\lfloor X/k \rfloor$ of them, plus a constant that cancels in a difference.

## Approach
Let $F(X) = \lfloor X / k \rfloor$, the index of the largest multiple of k that is at most X. Then
$$\text{answer} = F(R) - F(L - 1).$$
Example: $L = -7$, $R = 7$, $k = 2$. $F(7) = 3$ and $F(-8) = -4$, so the answer is $3 - (-4) = 7$. That matches $-6, -4, -2, 0, 2, 4, 6$.

## Why it works
The multiples of k are $jk$ for integers j, in increasing order. $jk \le X \iff j \le X/k \iff j \le \lfloor X/k \rfloor$, because j is an integer. So $jk \in [L, R]$ means $F(L-1) < j \le F(R)$, and that interval contains exactly $F(R) - F(L-1)$ integers. This holds for any sign of L and R, **provided the division is a true floor**.

## Complexity
$O(1)$ per query, $O(T)$ overall.

## Pitfalls
- C, C++, Java and JavaScript BigInt round toward zero. $-8 / 2 = -4$ is fine, but $-7 / 2$ gives $-3$ where the floor is $-4$. Correct the quotient when the remainder is non-zero and the numerator is negative (Java has `Math.floorDiv`).
- $L - 1$ can be $-10^{18} - 1$ and the answer can be $2 \cdot 10^{18} + 1$. Both fit in a signed 64-bit integer, but not in 32 bits or in a JS `Number`.
- Zero counts as a multiple.
