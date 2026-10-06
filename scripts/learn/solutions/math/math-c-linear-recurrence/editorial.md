## Intuition
Keep a window of the last k values, $v_m = (a_{m+k-1}, \dots, a_m)^T$. The next window is a **fixed linear function** of the current one: the new top entry is $\sum c_i a_{m+k-i}$, and the rest shift down. A fixed linear map is a matrix $C$, so $v_m = C^m v_0$. Matrix powers can be computed by squaring.

## Approach
1. If $n < k$, print $a_n$.
2. Build the $k \times k$ companion matrix $C$. Row 0 is $(c_1, \dots, c_k)$, and row $i \ge 1$ has a single 1 in column $i - 1$.
3. Compute $C^{\,n-k+1}$ by square-and-multiply, with every product reduced mod $M$.
4. With $v_0 = (a_{k-1}, \dots, a_0)$, $C^{\,n-k+1} v_0 = v_{n-k+1}$, whose top entry is $a_n$. That is row 0 of the power dotted with $v_0$.

Example: $k = 2$, $c = (1, 1)$, $a = (0, 1)$ is Fibonacci. Here $C = \begin{pmatrix}1&1\\1&0\end{pmatrix}$ and $n = 10$. Then $C^9 = \begin{pmatrix}55 & 34\\ 34 & 21\end{pmatrix}$, and $55 \cdot 1 + 34 \cdot 0 = 55 = a_{10}$.

## Why it works
By construction, $C v_m = v_{m+1}$: the top entry is the recurrence, and the shifted entries are copied. Induction gives $v_m = C^m v_0$. Matrix multiplication is associative, so $C^{e} = (C^{\lfloor e/2 \rfloor})^2 \cdot C^{e \bmod 2}$, and square-and-multiply evaluates this in $O(\log e)$ products. Working mod $M$ throughout is valid because every entry is a polynomial in the inputs, built from $+$ and $\times$ only.

## Complexity
Each product is $O(k^3)$ and there are about $2\log_2 n \le 120$ of them, so the total is $O(k^3 \log n) \approx 1.2 \cdot 10^5$ multiply-adds for $k = 10$. Memory is $O(k^2)$. Stepping one term at a time would be $O(nk)$, about $10^{19}$.

## Pitfalls
- A dot product of k terms each below $M^2 \approx 10^{18}$ overflows 64 bits. Reduce after **every** product.
- An off-by-one in the power: the exponent is $n - k + 1$, not $n$.
- $c_i = 0$ entries and $k = 1$ (a geometric sequence) must still work.
