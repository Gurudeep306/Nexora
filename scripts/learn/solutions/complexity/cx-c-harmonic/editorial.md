## Intuition
Summing $\lfloor n/i\rfloor$ for i = 1…n is $O(n) = 10^{12}$ steps — too slow. But the quotient $q = \lfloor n/i\rfloor$ takes only about $2\sqrt n$ **distinct** values: for $i \le \sqrt n$ there are at most $\sqrt n$ choices of i, and for $i > \sqrt n$ the quotient is below $\sqrt n$. Group the i's by their quotient.

## Approach
`i = 1`. While i ≤ n: `q = n / i`; the largest i' with the same quotient is `last = n / q`; add `q · (last − i + 1)`; set `i = last + 1`.

Example n = 5: i = 1 (q 5), 2 (q 2), 3..5 (q 1, three values) → 5 + 2 + 3 = **10**.

## Why it works
For a fixed quotient q, $\lfloor n/i\rfloor = q$ holds exactly for $\frac{n}{q+1} < i \le \frac{n}{q}$, so the block of equal quotients starting at i ends at $\lfloor n/q\rfloor$. Each loop iteration handles one block, adding its contribution in one multiplication. There are $O(\sqrt n)$ blocks.

## Complexity
$O(\sqrt n) \approx 2\cdot10^6$ iterations for $n = 10^{12}$; $O(1)$ space.

## Pitfalls
- S is about $n\ln n \approx 2.8\cdot10^{13}$: 64-bit.
- In JavaScript, every intermediate here stays below $2^{53}$, so plain numbers with `Math.floor` work.
