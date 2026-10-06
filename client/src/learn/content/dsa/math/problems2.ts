import { codeQ } from '../../assemble'

const T = 'math'

/** Judged coding problems for the sieve, divisor-function, modular-arithmetic and fast-power pages (scripts/learn/problems/math_parts/p2.py). */
export const codeQuestions2 = [
  codeQ(T, 'math-c-count-primes', 'sieve', 'Count primes up to n', 'easy', 'Sieve once up to the maximum n, then answer every query from a prefix count.'),
  codeQ(T, 'math-c-spf-factorize', 'sieve', 'Factorise many numbers', 'medium', 'Store the smallest prime factor of every value; then keep dividing x by spf[x].'),
  codeQ(T, 'math-c-segmented-sieve', 'sieve', 'Primes in a far-away window', 'hard', 'Sieve primes up to √R, then cross out their multiples only inside [L, R], starting at max(p², first multiple ≥ L).'),
  codeQ(T, 'math-c-divisor-count-sum', 'divisor-functions', 'Number and sum of divisors', 'easy', 'Factor by trial division up to √n; d(n) = ∏(e + 1) and σ(n) = ∏(1 + p + … + p^e).'),
  codeQ(T, 'math-c-coprime-pairs', 'divisor-functions', 'Coprime pairs in a square', 'medium', 'For the larger element b ≥ 2 there are φ(b) choices; the answer is 2·Σφ(k) − 1. Sieve φ.'),
  codeQ(T, 'math-c-sigma-mod', 'divisor-functions', 'Divisors of a giant number', 'medium', 'Multiply (p^(e+1) − 1)/(p − 1) per prime with a modular inverse — and special-case p ≡ 1 (mod 10⁹ + 7).'),
  codeQ(T, 'math-c-sigma-prefix', 'divisor-functions', 'Sum of all divisor sums', 'hard', 'Σσ(k) = Σ d·⌊n/d⌋; split the pairs d·q ≤ n at √n (hyperbola method).'),
  codeQ(T, 'math-c-sum-product-mod', 'modular-arithmetic', 'Sum and product, modulo', 'easy', 'Normalise each value into [0, M) first, then reduce after every addition and multiplication.'),
  codeQ(T, 'math-c-mulmod', 'modular-arithmetic', 'Multiply modulo a huge m', 'easy', 'The product of two values below 10¹⁸ needs 128 bits: use __int128, BigInt, or double-and-add.'),
  codeQ(T, 'math-c-power-tower', 'modular-arithmetic', 'Power tower modulo a prime', 'medium', 'By Fermat the exponent only matters mod p − 1 — unless p divides a.'),
  codeQ(T, 'math-c-fib-matrix', 'fast-power', 'Huge Fibonacci numbers', 'medium', 'Raise [[0, 1], [1, 1]] to the n-th power by squaring, or use the fast-doubling formulas.'),
  codeQ(T, 'math-c-linear-recurrence', 'fast-power', 'Linear recurrence, far ahead', 'hard', 'One step is a k × k companion matrix; raise it to the power n − k + 1.'),
]
