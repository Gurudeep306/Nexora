import type { Question } from '../../../questions/types'

const T = 'complexity'

/** Quiz questions for the cost model, asymptotic proofs and the limit test. */
export const questions2: Question[] = [
  // ── RAM model
  {
    id: 'cx-q-ram-not-o1', topic: T, page: 'ram-model', kind: 'mcq', difficulty: 'easy',
    title: 'Not one step',
    prompt: 'In the word-RAM model, which of these is **not** a constant-time operation?',
    options: ['Adding two 64-bit integers', 'Reading `a[i]` for a known index i', 'Checking whether two strings of length n are equal', 'Computing `x & (x - 1)` on a 64-bit word'],
    answer: 2,
    explain: 'String equality compares character by character — O(n) in the worst case (equal strings, or strings that differ only at the end). The other three each touch a constant number of machine words.',
  },
  {
    id: 'cx-q-ram-digits', topic: T, page: 'ram-model', kind: 'numeric', difficulty: 'medium',
    title: 'How long is 2¹⁰⁰?',
    prompt: 'How many decimal digits does $2^{100}$ have? (Use $\\log_{10} 2 \\approx 0.30103$.)',
    answer: 31,
    hint: 'A positive integer x has ⌊log₁₀ x⌋ + 1 digits.',
    explain: 'log₁₀ 2¹⁰⁰ = 100 · 0.30103 = 30.103, so ⌊30.103⌋ + 1 = 31 digits. It does not fit in a 64-bit word (max ≈ 1.8·10¹⁹, 20 digits), so arithmetic on it is a big-integer loop.',
  },
  {
    id: 'cx-q-ram-unit', topic: T, page: 'ram-model', kind: 'multi', difficulty: 'easy',
    title: 'Unit-cost operations',
    prompt: 'Select every operation the word-RAM model charges **one step** for (all operands are word-sized).',
    options: ['Integer multiplication', 'Comparison `a < b`', 'Jumping to a function and returning', 'Sorting a list of 10 numbers', 'Reading the word at a computed address'],
    answers: [0, 1, 2, 4],
    explain: 'Arithmetic, comparisons, calls/returns and memory access by address are all unit cost on words. Sorting is an algorithm made of many steps — even for 10 numbers it is a few dozen comparisons (constant, but not "one step").',
  },
  {
    id: 'cx-q-ram-factorial', topic: T, page: 'ram-model', kind: 'mcq', difficulty: 'hard',
    title: 'The real cost of a factorial loop',
    prompt: 'In Python, `f = 1; for k in range(2, n + 1): f *= k` computes n! exactly. Measured in word operations, its cost grows like…',
    options: ['Θ(n) — it is one loop', 'Θ(n log n)', 'Θ(n² log n)', 'Θ(n!)'],
    answer: 2,
    explain: 'After k iterations f = k! has Θ(k log k) bits, and multiplying it by the small number k costs a pass over all its words: Θ(k log k). Summing over k = 2…n gives Θ(n² log n). "One loop" would only be true if f stayed word-sized — for example, if we worked modulo a prime.',
  },
  {
    id: 'cx-q-ram-word', topic: T, page: 'ram-model', kind: 'text', difficulty: 'medium',
    title: 'How big is a word?',
    prompt: 'The word-RAM assumes the word size w is at least ____ bits, so that any index into an input of size n fits in one word. (Answer in terms of n.)',
    accept: ['log n', 'log2 n', 'log₂ n', 'logn', 'lg n', 'log(n)', 'log2(n)'],
    explain: 'Indices go up to n, and writing n in binary takes ⌈log₂(n + 1)⌉ bits. So w ≥ log₂ n; with w = 64 that covers any n a real computer can store.',
  },
  {
    id: 'cx-q-ram-why-cap', topic: T, page: 'ram-model', kind: 'mcq', difficulty: 'medium',
    title: 'Why cap the word size?',
    prompt: 'Why does the RAM model not allow words of unlimited size, with one-step arithmetic on them?',
    options: [
      'Because real computers cannot add numbers',
      'Because you could pack the whole input into one number and "solve" problems in O(1) steps, so step counts would stop predicting time',
      'Because logarithms would no longer work',
      'Because memory addresses must be even',
    ],
    answer: 1,
    explain: 'Unbounded words let one "step" do an unbounded amount of real work — e.g. encode n numbers into one huge integer and manipulate them all at once. Limiting words to O(log n) bits keeps a step a constant amount of real work.',
  },
  {
    id: 'cx-q-ram-basic-op', topic: T, page: 'ram-model', kind: 'match', difficulty: 'easy',
    title: 'The basic operation to count',
    prompt: 'Match each kind of algorithm with the operation usually counted to analyse it.',
    left: ['Comparison sorting', 'Graph shortest paths', 'Big-number multiplication', 'String matching'],
    right: ['comparisons between items', 'edge relaxations', 'digit (word) operations', 'character comparisons'],
    explain: 'Pick the operation that runs most often and that every other step is charged to. Its count is the running time up to a constant factor.',
  },

  // ── Asymptotic proofs
  {
    id: 'cx-q-pf-quantifier', topic: T, page: 'asymptotic-proofs', kind: 'mcq', difficulty: 'medium',
    title: 'One constant or every constant?',
    prompt: 'What is the difference between $f = O(g)$ and $f = o(g)$ in their definitions?',
    options: [
      'O needs the inequality for some constant c; o needs it for every constant c > 0',
      'O uses ≤ and o uses ≥',
      'o allows negative functions',
      'There is no difference — o is just shorthand',
    ],
    answer: 0,
    explain: 'f = O(g): ∃c, n₀ with f ≤ c·g. f = o(g): ∀c > 0 ∃n₀ with f < c·g — however small c is, f eventually drops below c·g. So n = O(2n) but n ≠ o(2n) (take c = ¼).',
  },
  {
    id: 'cx-q-pf-sum-rule', topic: T, page: 'asymptotic-proofs', kind: 'fill', difficulty: 'medium',
    title: 'Complete the sum-rule proof',
    prompt: 'Fill in the constants. We know $f_1 \\le c_1 g$ for $n \\ge n_1$ and $f_2 \\le c_2 g$ for $n \\ge n_2$.',
    code: `
For every n ≥ [[0]]:
    f1(n) + f2(n) ≤ c1·g(n) + c2·g(n) = [[1]] · g(n)
so f1 + f2 = O(g).`,
    lang: 'text',
    blanks: [['max(n1,n2)', 'max(n1, n2)', 'max(n₁,n₂)', 'max(n₁, n₂)'], ['(c1+c2)', 'c1+c2', '(c1 + c2)', 'c1 + c2', '(c₁+c₂)', 'c₁+c₂']],
    explain: 'Both inequalities must hold at once, which needs n beyond both thresholds: n₀ = max(n₁, n₂). Adding them gives the constant c₁ + c₂.',
  },
  {
    id: 'cx-q-pf-poly-n0', topic: T, page: 'asymptotic-proofs', kind: 'numeric', difficulty: 'medium',
    title: 'The threshold in the polynomial proof',
    prompt: 'The lesson’s lower-bound proof for $p(n) = a_k n^k + \\ldots$ uses $n_0 = 2A/a_k$ where $A$ is the sum of the absolute values of the lower coefficients. For $p(n) = 2n^2 - 10n + 3$, what is $n_0$?',
    answer: 13,
    explain: 'A = |−10| + |3| = 13 and a_k = 2, so n₀ = 2·13/2 = 13. From n = 13 on, p(n) ≥ (a_k/2)·n² = n². Check at n = 13: p = 338 − 130 + 3 = 211 ≥ 169 ✓.',
  },
  {
    id: 'cx-q-pf-logfact', topic: T, page: 'asymptotic-proofs', kind: 'mcq', difficulty: 'medium',
    title: 'log of a factorial',
    prompt: 'Which bound on $\\log_2 n!$ is correct and tight?',
    options: ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(log n)'],
    answer: 1,
    explain: 'n! ≤ nⁿ gives log n! ≤ n log n, and n! ≥ (n/2)^(n/2) gives log n! ≥ (n/2) log(n/2) = Ω(n log n). So Θ(n log n) — the reason comparison sorting needs Ω(n log n) comparisons.',
  },
  {
    id: 'cx-q-pf-fact-order', topic: T, page: 'asymptotic-proofs', kind: 'order', difficulty: 'medium',
    title: 'Order these',
    prompt: 'Order from slowest-growing to fastest-growing.',
    items: ['n¹⁰⁰', '2ⁿ', 'n!', 'nⁿ', '2^(2ⁿ)'],
    explain: 'Any polynomial is o of any exponential; 2ⁿ = o(n!) because n!/2ⁿ ≥ ½·(3/2)ⁿ⁻² → ∞; n! = o(nⁿ) because n!/nⁿ ≤ 1/n; and nⁿ = 2^(n log n) = o(2^(2ⁿ)) because n log n = o(2ⁿ).',
  },
  {
    id: 'cx-q-pf-false-induction', topic: T, page: 'asymptotic-proofs', kind: 'mcq', difficulty: 'hard',
    title: 'Find the flaw',
    prompt: '"Claim: 1 + 2 + … + n = O(n). Proof by induction: the base case is O(1); if the sum up to n − 1 is O(n), adding n keeps it O(n)." What is wrong?',
    options: [
      'Nothing — the claim is true',
      'The base case should be n = 0',
      'O(n) hides a constant; each step silently increases it, so no single constant works for all n',
      'Induction cannot be used for sums',
    ],
    answer: 2,
    explain: 'The sum is n(n+1)/2 = Θ(n²), so the claim is false. "= O(n)" is not a property of a single n. A valid proof must carry an explicit inequality S(n) ≤ c·n with c fixed in advance — and that inductive step fails: c(n−1) + n ≤ cn is false.',
  },
  {
    id: 'cx-q-pf-log-hides', topic: T, page: 'asymptotic-proofs', kind: 'mcq', difficulty: 'hard',
    title: 'Logs hide gaps',
    prompt: '$\\log(n!)$ and $\\log(n^n)$ are both $\\Theta(n \\log n)$. What follows about $n!$ and $n^n$?',
    options: ['n! = Θ(nⁿ)', 'Nothing directly — in fact n! = o(nⁿ)', 'nⁿ = o(n!)', 'They are equal for large n'],
    answer: 1,
    explain: 'Logs within a constant factor of each other say nothing about the original ratio: n!/nⁿ ≤ 1/n → 0. The same trap: log n and log n² are Θ of each other but n and n² are not.',
  },
  {
    id: 'cx-q-pf-n-plus-m', topic: T, page: 'asymptotic-proofs', kind: 'mcq', difficulty: 'easy',
    title: 'Two sizes',
    prompt: 'Is $O(n + m)$ the same class as $O(\\max(n, m))$?',
    options: ['Yes: max(n, m) ≤ n + m ≤ 2·max(n, m)', 'No: n + m can be twice as big', 'Only when n = m', 'No: max is not a polynomial'],
    answer: 0,
    explain: 'Each is at most a constant (2) times the other, so they are Θ of each other — the sum rule in action. Both are fine ways to write it; O(n + m) is the usual one.',
  },

  // ── Limits
  {
    id: 'cx-q-lim-zero', topic: T, page: 'limits-method', kind: 'mcq', difficulty: 'easy',
    title: 'Limit zero',
    prompt: 'If $\\lim_{n\\to\\infty} f(n)/g(n) = 0$, which statement is true?',
    options: ['f = Θ(g)', 'f = O(g) but f is not Ω(g)', 'f = Ω(g)', 'f and g are incomparable'],
    answer: 1,
    explain: 'A zero limit means f = o(g): f is eventually below c·g for every c > 0. That implies O(g) and rules out Ω(g).',
  },
  {
    id: 'cx-q-lim-const', topic: T, page: 'limits-method', kind: 'numeric', difficulty: 'medium',
    title: 'Compute the limit',
    prompt: 'Compute $\\lim_{n\\to\\infty} \\dfrac{3n^2 + 5n}{n^2 - 7}$.',
    answer: 3,
    explain: 'Divide top and bottom by n²: (3 + 5/n)/(1 − 7/n²) → 3. A positive finite limit, so the two are Θ of each other.',
  },
  {
    id: 'cx-q-lim-disguise', topic: T, page: 'limits-method', kind: 'mcq', difficulty: 'medium',
    title: 'A polynomial in disguise',
    prompt: 'What is $4^{\\log_2 n}$?',
    options: ['Θ(4ⁿ)', 'Θ(n²)', 'Θ(n)', 'Θ(2ⁿ)'],
    answer: 1,
    explain: '4^(log₂ n) = (2²)^(log₂ n) = 2^(2 log₂ n) = (2^(log₂ n))² = n². Rewrite everything as a power of 2 and compare exponents.',
  },
  {
    id: 'cx-q-lim-order', topic: T, page: 'limits-method', kind: 'order', difficulty: 'hard',
    title: 'Rank the disguised functions',
    prompt: 'Order from slowest-growing to fastest-growing.',
    items: ['n^(1/log₂ n)', 'log₂ log₂ n', '(√2)^(log₂ n)', 'n log₂ n', 'n^(log₂ log₂ n)', '2ⁿ'],
    explain: 'n^(1/log n) = 2 (constant); log log n; (√2)^(log n) = √n; n log n; n^(log log n) = 2^(log n·log log n) is super-polynomial but 2^(log n·log log n) = o(2ⁿ) because log n·log log n = o(n).',
  },
  {
    id: 'cx-q-lim-nlogn-2n', topic: T, page: 'limits-method', kind: 'mcq', difficulty: 'medium',
    title: 'Super-polynomial vs exponential',
    prompt: 'Compare $n^{\\log_2 n}$ and $2^n$.',
    options: ['n^(log n) = o(2ⁿ)', 'n^(log n) = Θ(2ⁿ)', 'n^(log n) = ω(2ⁿ)', 'n^(log n) is a polynomial'],
    answer: 0,
    explain: 'Take log₂: (log n)² versus n. Since (log n)² − n → −∞, the ratio n^(log n)/2ⁿ = 2^((log n)² − n) → 0. It beats every polynomial, but still loses to 2ⁿ.',
  },
  {
    id: 'cx-q-lim-no-limit', topic: T, page: 'limits-method', kind: 'multi', difficulty: 'hard',
    title: 'When the limit does not exist',
    prompt: 'Let $f(n) = n$ for even $n$ and $f(n) = n^2$ for odd $n$. Select every true statement.',
    options: ['f = O(n²)', 'f = Ω(n)', 'f = Θ(n)', 'f = Θ(n²)', 'lim f(n)/n exists'],
    answers: [0, 1],
    explain: 'f ≤ n² always and f ≥ n always, so O(n²) and Ω(n) hold. But f/n bounces between 1 and n — no limit, and neither Θ(n) (odd n escape any c·n) nor Θ(n²) (even n fall below any c·n²).',
  },
  {
    id: 'cx-q-lim-poly-exp', topic: T, page: 'limits-method', kind: 'text', difficulty: 'easy',
    title: 'Which wins eventually?',
    prompt: 'For huge n, which is larger: $n^{100}$ or $1.01^n$? (Answer with the expression.)',
    accept: ['1.01^n', '1.01ⁿ', '1.01**n', '1.01 ^ n'],
    explain: 'Every exponential with base > 1 eventually beats every polynomial: n¹⁰⁰/1.01ⁿ → 0 (L’Hôpital 100 times, or the ratio test). The crossover is late — around n ≈ 10⁵ — which is why small-n intuition misleads.',
  },
]
