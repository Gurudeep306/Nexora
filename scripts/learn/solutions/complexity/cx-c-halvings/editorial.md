## Intuition
Halving n until it reaches 1 takes $\lfloor\log_2 n\rfloor$ steps — that is the *definition* of the base-2 logarithm, rounded down. Even for $10^{18}$ that is only 59 steps, so simulating is perfectly fast. The trap is computing it with floating-point `log2`, which can be off by one near powers of two.

## Approach
Count integer halvings: `steps = 0; while n > 1: n //= 2; steps++`. (Equivalently: the bit length of n minus 1.)

Example 100 → 50 → 25 → 12 → 6 → 3 → 1: **6** steps.

## Why it works
If $2^k \le n < 2^{k+1}$, then after i halvings $2^{k-i} \le n_i < 2^{k-i+1}$ (floor division preserves this), so n reaches 1 after exactly k steps, and $k = \lfloor\log_2 n\rfloor$.

## Complexity
$O(\log n)$ per query — about 60 operations.

## Pitfalls
- `floor(log2(n))` in doubles: $2^{53}+1$ and nearby values are not exactly representable; `log2(2^{59} − 1)` may round up to 59.0.
- n = 1 needs 0 steps.
