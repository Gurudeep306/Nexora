## Intuition
Brute force tries every (buy, sell) pair: $O(n^2)$. But for a sale on day j, the best purchase is simply the **cheapest price before j**. Carry that minimum along one scan.

## Approach
`low = a[0]`, `best = 0`. For each later price x: `best = max(best, x − low)`, then `low = min(low, x)`.

Example `7 1 5 3 6 4`: buy at 1, sell at 6 → **5**. Example `7 6 4 3 1` → no profitable trade → **0**.

## Why it works
For each sell day j, the optimal profit with that sell day is $a_j - \min(a_0..a_{j-1})$, and `low` holds exactly that minimum when we reach j (we update it after using it, so we never buy and sell on the same day). Taking the best over all j gives the answer. (It is Kadane on the day-to-day differences.)

## Complexity
$O(n)$ time, $O(1)$ space.

## Pitfalls
- Update `low` **after** computing the profit.
- The answer is never negative: you may simply not trade.
