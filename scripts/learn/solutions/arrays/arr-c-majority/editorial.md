## Intuition
Counting every value needs a hash map ($O(n)$ space). **Boyer–Moore voting** needs $O(1)$: pair up two *different* values and throw both away. A majority element (more than n/2 copies) cannot be cancelled out completely, because it has more copies than everything else combined.

## Approach
1. **Find a candidate.** `cand`, `count = 0`. For each x: if `count == 0`, `cand = x`; then `count += (x == cand) ? 1 : −1`.
2. **Verify.** Count how often `cand` really occurs; print it if that is more than n/2, else −1.

Example `2 2 1 3 2 1 2 2 3` → candidate 2, which occurs 5 > 4.5 times → **2**.

## Why it works
Each decrement discards one copy of `cand` together with one different value. If a majority m exists, at most $n - c_m < c_m$ of its copies can be discarded by pairing with other values, so at least one copy survives and m is the final candidate. Without a majority the candidate can be anything — hence the verification pass.

## Complexity
Two passes, $O(n)$ time, $O(1)$ extra space.

## Pitfalls
- Skipping the verification: `1 2 3` yields candidate 3, which is not a majority.
- "More than n/2" is strict: 2 copies out of 4 is not a majority.
