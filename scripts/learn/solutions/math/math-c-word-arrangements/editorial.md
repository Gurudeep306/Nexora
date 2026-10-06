## Intuition
Label the letters so that all $n$ are distinguishable. Then there are $n!$ orderings. Removing the labels merges orderings that differ only by permuting equal letters among themselves. For a letter with $k_c$ copies that is $k_c!$ orderings per pattern, independently for each letter.

## Approach
1. Count each letter: $k_a, \dots, k_z$.
2. Answer $= n! \cdot \prod_c (k_c!)^{-1} \bmod p$. Precompute factorials up to $n$, and inverse factorials with one Fermat power followed by $\text{IF}[i-1] = \text{IF}[i] \cdot i$.

Example: `banana` has $n = 6$ with $k_a = 3$, $k_n = 2$, $k_b = 1$, so the answer is $\frac{720}{6 \cdot 2 \cdot 1} = 60$.

## Why it works
Consider the map from the $n!$ labelled orderings to plain strings. Fix a string $s$. Its preimages are obtained by assigning the $k_c$ labelled copies of each letter $c$ to the $k_c$ positions where $c$ occurs in $s$. That is $\prod_c k_c!$ assignments, and the number is the same for every $s$. So the number of distinct strings is $n! / \prod_c k_c!$, the multinomial coefficient $\binom{n}{k_a, \dots, k_z}$. It is an integer, and modulo the prime $p > n$ every $k_c!$ is invertible, so the modular formula gives the right residue.

The inverse-factorial recurrence holds because $(i-1)!^{-1} = i \cdot i!^{-1}$.

## Complexity
$O(n + \log p)$ time and $O(n)$ memory. Generating the permutations would be $\Theta(n!)$.

## Pitfalls
- Dividing $n! \bmod p$ by $k!$ with integer division is wrong. Multiply by the inverse instead.
- Products of residues need 64-bit (or a split multiplication in JS).
- Count only the letters that actually appear. $0! = 1$ is harmless anyway.
