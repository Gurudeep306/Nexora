## Intuition
"Product of everything except $a_i$" = (product of everything **left** of i) × (product of everything **right** of i). Dividing the total by $a_i$ fails with zeros and is not even defined under a modulus without inverses — prefix and suffix products avoid division altogether.

## Approach
1. `pre[i]` = product of `a[0..i−1]` (mod p), with `pre[0] = 1`.
2. Walk from the right with `suf` = product of `a[i+1..n−1]`; the answer for i is `pre[i] · suf`, then `suf *= a[i]`.

Example `1 2 3 4`: pre = 1 1 2 6; suffixes 24 12 4 1 → `24 12 8 6`.

## Why it works
For each i, `pre[i]` multiplies exactly the elements before i and `suf` (at the moment it is used) exactly the elements after i. Together they cover every element except $a_i$ once. Multiplication mod p is consistent, so reducing at every step gives the same residue as the true product.

## Complexity
$O(n)$ time, $O(n)$ space ($O(1)$ extra if you write the prefix products into the output array).

## Pitfalls
- Reduce mod $10^9+7$ after **every** multiplication; $(10^9)^2$ overflows 64-bit if you wait.
- JavaScript: $10^9 \cdot 10^9$ exceeds $2^{53}$, so use BigInt (or split the multiplication).
- n = 1: the product of nothing is 1.
