## Intuition
For a polynomial $p(n) = c_d n^d + \dots + c_1 n + c_0$ with non-negative coefficients, the highest power with a **non-zero** coefficient decides the growth; constants and lower-order terms vanish in the limit. The declared degree d is only an upper bound — leading zeros mean those terms are absent.

## Approach
Scan the coefficients from $c_d$ down and stop at the first non-zero one, $c_k$. Print `Theta(1)` if $k = 0$, `Theta(n)` if $k = 1$, else `Theta(n^k)`.

Example: `2 3 0 7` is $3n^2 + 7$ → `Theta(n^2)`; `3 0 0 5 1` is $5n + 1$ → `Theta(n)`; `0 42` → `Theta(1)`.

## Why it works
Let $k$ be the top non-zero index and $C = \sum_i c_i$. For $n \ge 1$, every term $c_i n^i$ with $i \le k$ satisfies $c_i n^i \le c_i n^k$, so $p(n) \le C\, n^k$. And since all coefficients are non-negative, $p(n) \ge c_k n^k$ with $c_k \ge 1$. Hence $c_k n^k \le p(n) \le C n^k$ for all $n \ge 1$, which is exactly $p(n) = \Theta(n^k)$. (Non-negativity matters: $n^2 - n^2 + n$ would not be $\Theta(n^2)$.)

## Complexity
$O(d)$ per query, $O(\sum d) \le 11\,000$ overall.

## Pitfalls
- Do not take the degree from the first number blindly: `10 0 0 … 1 0` is $\Theta(n)$.
- Coefficients are read from $c_d$ down to $c_0$ — index $i$ in the list is power $d - i$.
- The exact spelling matters: `Theta(1)` and `Theta(n)` have no exponent, other powers use `Theta(n^k)`.
