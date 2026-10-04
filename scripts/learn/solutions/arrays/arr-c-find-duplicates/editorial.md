## Intuition
Values lie in 1…n, so each value v has a "home" index v−1 in the array itself. We can use the **sign** of `a[v−1]` as a one-bit "seen v" flag — no extra memory. The values are still recoverable from their absolute value.

## Approach
For each index i: let `v = |a[i]|`. If `a[v−1]` is already negative, v was seen before → it is a duplicate. Otherwise negate `a[v−1]`. Sort the duplicates (or collect them in a boolean array) and print them, or −1.

Example `4 3 2 7 8 2 3 1`: marking 4, 3, 2, 7, 8, then 2 finds a[1] negative (dup **2**), then 3 finds a[2] negative (dup **3**).

## Why it works
`a[v−1] < 0` exactly when v has been processed earlier: we negate it on v's first appearance and never flip it back. Each value occurs at most twice, so the second appearance reports it once. Taking `|a[i]|` reads the original value even after its slot was negated.

## Complexity
$O(n)$ time; $O(1)$ extra space apart from the output (sorting the at most n/2 duplicates is $O(d\log d)$, or $O(n)$ with a presence array).

## Pitfalls
- Use the absolute value when reading `a[i]` — it may already be negated.
- The output must be sorted; the order you find duplicates in is not.
