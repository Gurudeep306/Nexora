## Intuition
A $10^5$-digit number fits in no machine type, and a big-integer parse is slow (Python even refuses one by default). But $N = \sum_i d_i 10^i$, where $d_0$ is the units digit. So we only need $10^i$ modulo 9 and modulo 11, and both are tiny.

## Approach
- $10 \equiv 1 \pmod 9$, so $10^i \equiv 1$ and $N \equiv \sum d_i \pmod 9$.
- $10 \equiv -1 \pmod{11}$, so $10^i \equiv (-1)^i$ and $N \equiv d_0 - d_1 + d_2 - \dots \pmod{11}$.

Make one pass over the digits from the right, keeping the digit sum and the alternating sum. Normalise the alternating sum into $[0, 11)$ at the end.

Example: $N = 1234$. The digit sum is $10$, so $N \bmod 9 = 1$. The alternating sum from the right is $4 - 3 + 2 - 1 = 2$, so $N \bmod 11 = 2$. Check: $1234 = 9 \cdot 137 + 1 = 11 \cdot 112 + 2$. Output `1 2`.

## Why it works
Congruences respect sums and products. If $10 \equiv r \pmod m$ then $10^i \equiv r^i$, and $N = \sum d_i 10^i \equiv \sum d_i r^i \pmod m$. With $r = 1$ for $m = 9$ and $r = -1$ for $m = 11$, this gives the two rules. The same argument yields any rule of this kind, for example $100 \equiv 1 \pmod{99}$.

## Complexity
$O(\text{total digits})$ time. Extra memory is $O(1)$ beyond the input line.

## Pitfalls
- The alternating signs start at the **units** digit. Starting from the left is only correct when the length is odd. Otherwise every sign flips.
- The alternating sum can be negative. In C, C++, Java and JavaScript, `%` keeps the sign, so add 11 before printing.
- `0` is a valid input; its answer is `0 0`.
