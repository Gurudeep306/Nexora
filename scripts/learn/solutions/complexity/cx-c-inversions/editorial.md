## Intuition
Testing all pairs is $\Theta(n^2)$ — $2\cdot10^{10}$ comparisons for $n = 2\cdot10^5$, roughly a minute of work. Divide and conquer: every inversion $(i, j)$ lies entirely in the left half, entirely in the right half, or **crosses** the middle. The first two kinds are counted recursively; the crossing ones can be counted while **merging** the two sorted halves.

## Approach
Merge sort, returning the count as well. When merging sorted $L$ and $R$:
- if $L[i] \le R[j]$, output $L[i]$ (no new inversion);
- otherwise output $R[j]$ — it is smaller than $L[i], L[i+1], \dots$, i.e. it forms an inversion with all $|L| - i$ remaining left elements: add $|L| - i$.

Example `2 4 1 3 5`: halves `2 4` | `1 3 5`. Placing 1 jumps over 2 and 4 (+2); placing 3 jumps over 4 (+1) → **3**.

## Why it works
Sorting each half does not change which crossing pairs are inversions (it only permutes positions *within* a side). In the merge, a crossing pair $(\ell, r)$ with $\ell > r$ is counted exactly once — at the moment $r$ is output, $\ell$ has not been output yet (since $\ell > r$) and is among the $|L| - i$ remaining. Pairs with $\ell \le r$ are never counted because $\ell$ leaves first.

## Complexity
$T(n) = 2T(n/2) + \Theta(n) = \Theta(n\log n)$ by the master theorem: about $3.6\cdot10^6$ steps. $O(n)$ extra memory for the merge buffer.

## Pitfalls
- The count reaches $n(n-1)/2 \approx 2\cdot10^{10}$: use 64-bit.
- Ties: use `<=` so equal values go left first — equal values are **not** inversions.
- A bottom-up (iterative) merge sort avoids recursion entirely; the recursive one only goes $\log_2 n \approx 18$ deep, which is also safe.
