## Intuition
Testing each $x \in [a, b]$ is $O(b)$ — $10^{18}$ steps. Count square **roots** instead: $x^2 \le b \iff x \le \lfloor\sqrt b\rfloor$. So the number of positive squares up to $m$ is $\lfloor\sqrt m\rfloor$, and a range is a difference of two prefix counts:
$$\text{answer} = \lfloor\sqrt b\rfloor - \lfloor\sqrt{a-1}\rfloor.$$

## Approach
Compute an exact integer square root (`isqrt`) of $b$ and of $a-1$ and subtract. The isqrt is a double `sqrt` guess, corrected with integer comparisons until $r^2 \le m < (r+1)^2$.

Example $a = 17, b = 24$: $\lfloor\sqrt{24}\rfloor - \lfloor\sqrt{16}\rfloor = 4 - 4 = $ **0**. For $[1, 10]$: $3 - 0 = 3$ (1, 4, 9).

## Why it works
The squares in $[1, m]$ are $1^2, 2^2, \dots, \lfloor\sqrt m\rfloor^2$, so their count is $\lfloor\sqrt m\rfloor$. Squares in $[a, b]$ are those in $[1, b]$ minus those in $[1, a-1]$ — using $a-1$, not $a$, keeps $a$ itself when it is a square.

This is the $O(\sqrt n)$ versus $O(1)$ idea from growth classes: we never enumerate the $\Theta(\sqrt b)$ squares, we compute how many there are.

## Complexity
$O(1)$ per query (the correction loops run at most a couple of times).

## Pitfalls
- Off by one: subtract $\lfloor\sqrt{a-1}\rfloor$, not $\lfloor\sqrt a\rfloor$; $a = 1$ gives $\operatorname{isqrt}(0) = 0$.
- Precision: `(long long)sqrt(999999999999999999.0)` returns $10^9$ because the double rounds the input up to $10^{18}$. Correct with $r\cdot r > m$.
- $(r+1)^2$ with $r \approx 10^9$ needs 64-bit arithmetic.
- JavaScript: `BigInt` for $a$, $b$ and the correction.
