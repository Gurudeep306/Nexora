## Intuition
There are $\binom{n}{2} \approx 2\cdot10^{10}$ pairs, so we cannot look at them. Instead, for each element ask "how many **earlier** elements equal $T - a_j$?" — a hash-map lookup. Each pair (i < j) is then counted exactly once, at its right end j.

## Approach
`count = 0`, empty map `seen`. For each x: `count += seen[T − x]`, then `seen[x]++`.

(Alternative without hashing: sort, then two pointers; when the sum matches, count the run of equal values on each side — needed when both ends hold the same value.)

Example `1 5 3 3 5`, T = 6: pairs (1,5), (1,5), (3,3) → **3**.

## Why it works
When processing $a_j$, `seen` holds the multiset of $a_0..a_{j-1}$, so `seen[T − a_j]` is exactly the number of i < j with $a_i + a_j = T$. Summing over j counts every valid pair once.

## Complexity
$O(n)$ expected time with hashing, $O(n)$ space. Sorting + two pointers: $O(n\log n)$, $O(1)$ extra.

## Pitfalls
- The answer can reach $\approx 2\cdot10^{10}$ (all values equal): 64-bit.
- Look up before inserting x, or x pairs with itself when $2x = T$.
- $T - x$ can exceed 32 bits ($|T| \le 2\cdot10^9$).
