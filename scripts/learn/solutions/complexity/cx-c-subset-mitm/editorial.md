## Intuition
$2^{40} \approx 10^{12}$ subsets is far too many, and values up to $10^{12}$ rule out any table over sums. **Meet in the middle**: a subset of all items is a subset $A$ of the first half plus a subset $B$ of the second half, and its sum is $s_A + s_B$. So we need the number of pairs with $s_A + s_B = T$ — a pair-counting problem on two lists of $2^{20}$ numbers each. Exponential, but $2^{n/2}$ instead of $2^n$.

## Approach
1. Split the items into halves of sizes $\lfloor n/2\rfloor$ and $\lceil n/2\rceil$.
2. List all subset sums of each half **in sorted order**: start from `[0]`; for each item $x$, merge the list with the same list shifted by $x$ (two sorted lists merge in linear time — no separate sort needed).
3. Two pointers: $i$ ascends through $L$, $j$ descends through $R$. If $L_i + R_j < T$ advance $i$; if larger, retreat $j$; if equal, count the run of equal values on each side and add the product of the run lengths.

Example `2 2 2 2`, T = 4: both halves give `0 2 2 4`. Pairs (0,4), (2,2)×4, (4,0) → **6**.

## Why it works
Splitting is a bijection between subsets and pairs $(A, B)$, so counting pairs counts subsets. In the two-pointer scan, when $L_i + R_j < T$ no later (smaller) $R$ entry can pair with $L_i$ either, so discarding $L_i$ loses nothing; symmetrically for $>$. Equal runs must be multiplied, not counted once.

## Complexity
$O(2^{n/2})$ for the merge-based generation and the scan (with a sort instead: $O(2^{n/2}\cdot n)$), memory $O(2^{n/2})$ — about 16 MB of 64-bit sums. Compare $O(2^n)$ for brute force: a factor of $10^6$.

## Pitfalls
- Sums up to $4\cdot10^{13}$ and the answer up to $2^{40}$: 64-bit (JavaScript doubles are exact below $2^{53}$).
- Count **runs** of equal sums ($a_i$ may repeat): with 40 ones the answer is $\binom{40}{20} \approx 1.4\cdot10^{11}$.
- n = 1: one half is empty and its only sum is 0.
