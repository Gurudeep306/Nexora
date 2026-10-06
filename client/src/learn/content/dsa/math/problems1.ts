import { codeQ } from '../../assemble'

const T = 'math'

/** Judged coding problems for the divisibility, gcd-lcm, extended-euclid and primes pages (scripts/learn/problems/math_parts/p1.py). */
export const codeQuestions1 = [
  codeQ(T, 'math-c-multiples-range', 'divisibility', 'Multiples in a range', 'easy', 'Count multiples of k in [L, R] with floor division that is correct for negatives.'),
  codeQ(T, 'math-c-mod-9-11', 'divisibility', 'Remainders by 9 and 11', 'easy', 'A number with 10⁵ digits: fold the digits instead of parsing it.'),
  codeQ(T, 'math-c-subarray-div-k', 'divisibility', 'Subarrays divisible by k', 'medium', 'Equal prefix remainders mean a divisible subarray — normalise negative remainders.'),
  codeQ(T, 'math-c-reduce-fraction', 'gcd-lcm', 'Reduce a fraction', 'easy', 'Divide by the gcd and fix the sign.'),
  codeQ(T, 'math-c-array-gcd-lcm', 'gcd-lcm', 'GCD and LCM of an array', 'medium', 'Fold gcd and lcm — and detect when the lcm passes 10¹⁸ before it overflows.'),
  codeQ(T, 'math-c-coprime-array-pairs', 'gcd-lcm', 'Coprime pairs in an array', 'hard', 'Count pairs with gcd 1 by inclusion–exclusion over divisors (Möbius).'),
  codeQ(T, 'math-c-dio-min-x', 'extended-euclid', 'Smallest non-negative x', 'medium', 'Solve ax + by = c with extended Euclid, then shift x into [0, b/g).'),
  codeQ(T, 'math-c-dio-count', 'extended-euclid', 'Count non-negative solutions', 'medium', 'Pay c with coins a and b: the solutions form an arithmetic progression — count it.'),
  codeQ(T, 'math-c-min-bezout', 'extended-euclid', 'Smallest |x| + |y|', 'hard', 'Walk the one-parameter family of solutions to where |x| + |y| bottoms out.'),
  codeQ(T, 'math-c-is-prime', 'primes', 'Is it prime?', 'easy', 'Trial division up to √n.'),
  codeQ(T, 'math-c-factorize', 'primes', 'Prime factorisation', 'medium', 'Trial division to √n; whatever is left above 1 is prime.'),
  codeQ(T, 'math-c-miller-rabin', 'primes', 'Primality up to 4·10¹⁸', 'hard', '√n is 2·10⁹ — too slow. Deterministic Miller–Rabin with overflow-safe mulmod.'),
]
