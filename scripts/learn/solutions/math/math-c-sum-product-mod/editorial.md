## Intuition
The true product of $2 \cdot 10^5$ numbers of 18 digits has millions of digits. We only need it modulo $M = 10^9 + 7$, and remainders behave well under addition and multiplication. So we can reduce **after every step** and never hold anything larger than about $M^2 < 2^{63}$.

## Approach
1. Reduce each input into $[0, M)$ with $r = ((x \bmod M) + M) \bmod M$.
2. Keep `s = (s + r) mod M` and `p = p * r mod M`, starting from $s = 0$ and $p = 1$.

Example: `3 -5 10`. The residues are $3$, $M - 5$ and $10$. The sum is $8$. The product is $3 \cdot (M - 5) \cdot 10 \equiv -150 \equiv M - 150 = 999999857$.

## Why it works
Write $x = qM + r$. Then $(x + y) - (r_x + r_y)$ and $xy - r_x r_y$ are both multiples of $M$, so
$$x + y \equiv r_x + r_y, \qquad xy \equiv r_x r_y \pmod M.$$
By induction over the array, the running values are congruent to the true sum and product. Every stored value lies in $[0, M)$, so the printed number is *the* canonical residue. The second step of the normalization adds $M$ to a remainder in $(-M, M)$ to make it non-negative, then reduces again.

## Complexity
$O(n)$ time and $O(1)$ extra memory.

## Pitfalls
- In C, C++, Java and JavaScript, `-5 % M` is `-5`, not `M - 5`. Always normalise.
- $r_x \cdot r_y < M^2 \approx 10^{18}$ fits in a signed 64-bit integer. Multiplying **before** reducing $x$ (up to $10^{18}$) overflows.
- A factor equal to a multiple of $M$ makes the product 0 forever. That is correct, not a bug.
- In JavaScript, inputs up to $10^{18}$ lose precision as `Number`. Parse them with `BigInt`, and multiply two 30-bit residues in two halves so the product stays below $2^{53}$.
