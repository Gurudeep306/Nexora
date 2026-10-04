## Intuition
Copies happen only when the array is full: at sizes 1, 2, 4, 8, … — each time copying the whole current content. So after n pushes the capacity is the smallest power of two that is ≥ n, and the total number of copies is $1 + 2 + 4 + \dots + \text{cap}/2 = \text{cap} - 1$. Simulating $10^{18}$ pushes is impossible, but there are only about 60 doublings.

## Approach
`cap = 1`, `copies = 0`. While `cap < n`: `copies += cap`, `cap *= 2`. Print `copies cap`.

Example n = 5: doublings at size 1 (+1), 2 (+2), 4 (+4) → copies 7, capacity 8.

## Why it works
A doubling happens exactly when a push finds size = cap, and at that moment it copies cap elements and doubles cap. The loop performs those doublings in order until the capacity can hold n elements. The geometric sum shows copies = cap − 1 < 2n, which is the heart of the **amortized O(1)** push: total work for n pushes is under 3n.

## Complexity
$O(\log n)$ time, $O(1)$ space.

## Pitfalls
- n up to $10^{18}$: 64-bit integers (BigInt in JavaScript — doubles lose precision past $2^{53}$).
- n = 1: no copies, capacity 1.
