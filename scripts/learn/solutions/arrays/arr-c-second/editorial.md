## Intuition
Sorting and taking the second distinct value from the top works but costs $O(n\log n)$. We only ever need **the top two distinct values seen so far**, so we can carry them through one scan.

## Approach
Keep `first` (largest) and `second` (largest value strictly below `first`), both starting at −1 (all values are ≥ 0, so −1 means "none yet"). For each x:
- if `x > first`: the old first becomes second, x becomes first;
- else if `first > x > second`: x becomes second;
- equal to first: ignore (we want **distinct** values).

At the end print `second` (still −1 if every value was equal).

Example `5 9 9 3 7 9`: (5,−1) → (9,5) → 9 ignored → 3 ignored → (9,7) → 9 ignored. Answer **7**.

## Why it works
Invariant: after each prefix, `first` is its largest value and `second` the largest value strictly smaller than `first` (or −1). Each case above restores the invariant for the longer prefix; the "equal" case is what keeps duplicates of the maximum from being counted as the second largest.

## Complexity
Time $O(n)$, space $O(1)$.

## Pitfalls
- Duplicates of the maximum: `9 9 3` → 3, not 9.
- All equal (or n = 1) → −1.
- The check must be strict on both sides: `first > x > second`.
