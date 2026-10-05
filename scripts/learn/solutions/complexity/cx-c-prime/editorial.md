## Intuition
n is prime iff no number from 2 to $\sqrt n$ divides it (any factorisation $n = ab$ has $\min(a, b) \le \sqrt n$). For $n \le 10^{12}$ that is up to $10^6$ trial divisions per number — fine for 20 numbers. Skipping multiples of 2 and 3 cuts the work by a factor of 3: every prime above 3 has the form $6k \pm 1$.

## Approach
n < 2 → NO; n ≤ 3 → YES; divisible by 2 or 3 → NO. Then test i = 5, 7, 11, 13, … (i and i+2, stepping i by 6) while $i^2 \le n$.

## Why it works
A composite n has a prime factor $p \le \sqrt n$. Every prime is 2, 3, or $\equiv \pm1 \pmod 6$, and we test all such candidates up to $\sqrt n$ (a superset of the primes), so a composite is always caught; a prime has no such divisor and passes.

## Complexity
$O(\sqrt n / 3)$ ≈ $3.3\cdot10^5$ divisions per number, $\approx 7\cdot10^6$ in total.

## Pitfalls
- 1 is **not** prime; 2 and 3 are.
- `i*i` up to $10^{12}$: 64-bit.
- For far larger n (say $10^{18}$), trial division is too slow — use deterministic Miller–Rabin (Math topic).
