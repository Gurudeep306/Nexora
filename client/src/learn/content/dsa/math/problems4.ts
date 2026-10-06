import { codeQ } from '../../assemble'

const T = 'math'

export const codeQuestions4 = [
  codeQ(T, 'math-c-coprime-count', 'inclusion-exclusion', 'Count numbers coprime to m', 'easy', 'Inclusion–exclusion over the distinct prime factors of m: alternately add and subtract ⌊n/d⌋.'),
  codeQ(T, 'math-c-div-any', 'inclusion-exclusion', 'Divisible by at least one', 'medium', 'Alternate ⌊n/lcm⌋ over subsets; prune a subset as soon as its lcm exceeds n, and check that before multiplying.'),
  codeQ(T, 'math-c-surjections', 'inclusion-exclusion', 'Every worker gets a task', 'medium', 'Σ (−1)^i C(k, i) (k − i)^n: inclusion–exclusion over the idle workers.'),
  codeQ(T, 'math-c-gcd-pairs', 'inclusion-exclusion', 'Pairs with gcd exactly k', 'hard', 'Divide by k, then count coprime pairs as Σ μ(d)⌊A/d⌋⌊B/d⌋ over blocks of equal quotients.'),
  codeQ(T, 'math-c-expected-inversions', 'probability', 'Expected inversions', 'easy', 'Linearity of expectation: each of the C(n, 2) pairs is inverted with probability 1/2.'),
  codeQ(T, 'math-c-derangement-prob', 'probability', 'Nobody gets their own hat', 'easy', 'Precompute D(n) = n·D(n−1) + (−1)^n and n!, then answer D(n)/n! with a modular inverse.'),
  codeQ(T, 'math-c-coupon-collector', 'probability', 'Collect c different faces', 'medium', 'Each phase is geometric with mean m/(m − j); precompute the harmonic numbers mod p.'),
  codeQ(T, 'math-c-expected-max', 'probability', 'Expected maximum of k dice', 'medium', 'Use the tail sum: E[max] = m − Σ_{y<m} (y/m)^k.'),
  codeQ(T, 'math-c-big-multiply', 'number-patterns', 'Multiply huge numbers', 'easy', 'Grade-school multiplication: add digit products into columns i + j, then carry once.'),
  codeQ(T, 'math-c-base-convert', 'number-patterns', 'Convert between bases', 'medium', 'Repeatedly long-divide the base-a digit array by b; the remainders are the base-b digits.'),
  codeQ(T, 'math-c-perfect-power', 'number-patterns', 'Largest perfect power', 'hard', 'For k = 59 down to 2, take an exact integer k-th root (float estimate, then integer fix-up) and test it.'),
  codeQ(T, 'math-c-divisor-sum-prefix', 'number-patterns', 'Sum of divisor sums', 'hard', 'Σσ(i) = Σ d·⌊n/d⌋; group d by equal quotients into O(√n) blocks.'),
]
