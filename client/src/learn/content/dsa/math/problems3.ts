import { codeQ } from '../../assemble'

const T = 'math'

/** Judged coding problems for the modular-inverse, crt, counting and pascal-binomial pages (scripts/learn/problems/math_parts/p3.py). */
export const codeQuestions3 = [
  codeQ(T, 'math-c-mod-inverse', 'modular-inverse', 'Modular inverse queries', 'easy', 'Extended Euclid gives the inverse — or proves there is none.'),
  codeQ(T, 'math-c-harmonic-mod', 'modular-inverse', 'Harmonic numbers modulo a prime', 'medium', 'Inverses of 1…n in O(n) with inv[i] = −⌊p/i⌋·inv[p mod i].'),
  codeQ(T, 'math-c-fraction-sum', 'modular-inverse', 'Sum of fractions modulo p', 'easy', 'Division under a prime modulus is multiplication by an inverse.'),
  codeQ(T, 'math-c-crt-two', 'crt', 'Two congruences', 'medium', 'Merge two congruences whose moduli need not be coprime — or report a contradiction.'),
  codeQ(T, 'math-c-crt-many', 'crt', 'A system of congruences', 'hard', 'Merge congruences one at a time without overflowing the growing modulus.'),
  codeQ(T, 'math-c-word-arrangements', 'counting', 'Arrangements of a word', 'easy', 'n! divided by the factorial of each letter count, modulo p.'),
  codeQ(T, 'math-c-stars-bars', 'counting', 'Candies with a minimum', 'medium', 'Give everyone their minimum first, then stars and bars.'),
  codeQ(T, 'math-c-grid-blocked', 'counting', 'Grid paths around a rock', 'medium', 'All paths minus the paths through the rock — two binomials.'),
  codeQ(T, 'math-c-ncr-queries', 'pascal-binomial', 'Binomial coefficient queries', 'medium', 'Factorials and inverse factorials once; then every C(n, k) is O(1).'),
  codeQ(T, 'math-c-catalan', 'pascal-binomial', 'Balanced bracket strings', 'medium', 'The Catalan number C(2n, n)/(n + 1).'),
  codeQ(T, 'math-c-lucas', 'pascal-binomial', 'Huge binomials modulo a small prime', 'hard', 'n up to 10¹⁸, p small: Lucas — digit by digit in base p.'),
  codeQ(T, 'math-c-binom-any-mod', 'pascal-binomial', 'Binomials modulo any m', 'hard', 'm is not prime: walk the row, keeping m’s prime factors apart from the unit part.'),
]
