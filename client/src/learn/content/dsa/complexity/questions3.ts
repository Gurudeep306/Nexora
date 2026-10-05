import type { Question } from '../../../questions/types'

const T = 'complexity'

/** Quiz questions for sums, the field guide to tricky code, and runtime estimation. */
export const questions3: Question[] = [
  // ── Summations
  {
    id: 'cx-q-sum-squares', topic: T, page: 'summations', kind: 'numeric', difficulty: 'easy',
    title: 'Sum of squares',
    prompt: 'Compute $1^2 + 2^2 + \\cdots + 10^2$ using $\\frac{n(n+1)(2n+1)}{6}$.',
    answer: 385,
    explain: '10·11·21/6 = 2310/6 = 385.',
  },
  {
    id: 'cx-q-sum-geo-loop', topic: T, page: 'summations', kind: 'mcq', difficulty: 'medium',
    title: 'The doubling trap',
    prompt: 'What is the complexity of\n```\nfor (i = 1; i < n; i *= 2)\n    for (j = 0; j < i; j++) work();\n```',
    options: ['Θ(log n)', 'Θ(n)', 'Θ(n log n)', 'Θ(n²)'],
    answer: 1,
    explain: 'The inner loop runs 1, 2, 4, … , 2^⌊log₂(n−1)⌋ times. A geometric series is Θ of its largest term, which is < n, and the whole sum is < 2n. Multiplying "log n outer × n inner" overcounts because the inner count depends on i.',
  },
  {
    id: 'cx-q-sum-geo-bound', topic: T, page: 'summations', kind: 'numeric', difficulty: 'easy',
    title: 'Powers of two',
    prompt: 'Compute $1 + 2 + 4 + \\cdots + 512$.',
    answer: 1023,
    explain: 'Σ_{k=0}^{9} 2ᵏ = 2¹⁰ − 1 = 1023 — just under twice the last term, as the geometric-series rule promises.',
  },
  {
    id: 'cx-q-sum-harmonic-bound', topic: T, page: 'summations', kind: 'mcq', difficulty: 'medium',
    title: 'Bounding Hₙ',
    prompt: 'Which bound on $H_n = 1 + \\frac12 + \\cdots + \\frac1n$ follows from comparing with $\\int dx/x$?',
    options: ['ln(n+1) ≤ Hₙ ≤ 1 + ln n', 'n/2 ≤ Hₙ ≤ n', 'Hₙ ≤ 2 for all n', 'log₂ n ≤ Hₙ ≤ log₂ n + 1'],
    answer: 0,
    explain: 'Each 1/k lies between the area under 1/x on [k, k+1] and on [k−1, k]. Summing gives ln(n+1) ≤ Hₙ ≤ 1 + ln n, so Hₙ = Θ(log n). (log₂ n is too big: log₂ n ≈ 1.44 ln n.)',
  },
  {
    id: 'cx-q-sum-triple', topic: T, page: 'summations', kind: 'numeric', difficulty: 'medium',
    title: 'Three dependent loops',
    prompt: 'How many times does `work()` run?\n```\nfor (i = 0; i < 10; i++)\n    for (j = 0; j < i; j++)\n        for (k = 0; k < j; k++) work();\n```',
    answer: 120,
    hint: 'Each run corresponds to a choice of k < j < i from {0, …, 9}.',
    explain: 'Every triple k < j < i of distinct numbers from {0…9} is visited exactly once, so the count is C(10, 3) = 120. In general C(n, 3) = n(n−1)(n−2)/6 = Θ(n³).',
  },
  {
    id: 'cx-q-sum-k2k', topic: T, page: 'summations', kind: 'numeric', difficulty: 'hard',
    title: 'Σ k / 2ᵏ',
    prompt: 'What is $\\sum_{k=0}^{\\infty} \\dfrac{k}{2^k}$?',
    answer: 2,
    explain: 'Σ k xᵏ = x/(1−x)² (differentiate the geometric series and multiply by x). At x = ½: (½)/(¼) = 2. This bounds the sift-down work when building a heap: Σ (n/2^(h+1))·h ≤ n.',
  },
  {
    id: 'cx-q-sum-sqrt-loop', topic: T, page: 'summations', kind: 'mcq', difficulty: 'medium',
    title: 'A square-root inner loop',
    prompt: 'What is the complexity of\n```\nfor (i = 1; i <= n; i++)\n    for (j = 1; j * j <= i; j++) work();\n```',
    options: ['Θ(n)', 'Θ(n log n)', 'Θ(n^1.5)', 'Θ(n²)'],
    answer: 2,
    explain: 'The inner loop runs ⌊√i⌋ times. Σ √i lies between ∫₀ⁿ √x dx = (2/3)n^1.5 and (2/3)(n+1)^1.5, so Θ(n^1.5).',
  },
  {
    id: 'cx-q-sum-match', topic: T, page: 'summations', kind: 'match', difficulty: 'medium',
    title: 'Sum to growth',
    prompt: 'Match each sum with its order of growth.',
    left: ['1 + 2 + … + n', '1 + ½ + ⅓ + … + 1/n', 'n + n/2 + n/4 + …', 'log 1 + log 2 + … + log n'],
    right: ['Θ(n²)', 'Θ(log n)', 'Θ(n)', 'Θ(n log n)'],
    explain: 'Arithmetic → n²; harmonic → ln n; decreasing geometric → its first term n; Σ log k = log n! → n log n.',
  },

  // ── Code fragments
  {
    id: 'cx-q-frag-sqrt', topic: T, page: 'code-fragments', kind: 'numeric', difficulty: 'easy',
    title: 'Count the iterations',
    prompt: 'How many times does the body of `for (i = 1; i * i <= 1000; i++)` run?',
    answer: 31,
    explain: '31² = 961 ≤ 1000 but 32² = 1024 > 1000, so i = 1…31: ⌊√1000⌋ = 31 iterations.',
  },
  {
    id: 'cx-q-frag-halving-inner', topic: T, page: 'code-fragments', kind: 'mcq', difficulty: 'medium',
    title: 'Shrinking inner loop',
    prompt: 'Complexity of\n```\nfor (i = n; i > 0; i /= 2)\n    for (j = 0; j < i; j++) work();\n```',
    options: ['Θ(log n)', 'Θ(n)', 'Θ(n log n)', 'Θ(n²)'],
    answer: 1,
    explain: 'Inner counts n, n/2, n/4, … — a decreasing geometric series summing to < 2n. Θ(n).',
  },
  {
    id: 'cx-q-frag-n4', topic: T, page: 'code-fragments', kind: 'mcq', difficulty: 'hard',
    title: 'The filtered triple loop',
    prompt: 'Complexity of\n```\nfor (i = 1; i < n; i++)\n  for (j = 1; j < i * i; j++)\n    if (j % i == 0)\n      for (k = 0; k < j; k++) work();\n```',
    options: ['Θ(n³)', 'Θ(n⁴)', 'Θ(n⁵)', 'Θ(n² log n)'],
    answer: 1,
    explain: 'The innermost loop runs only for j = i, 2i, …, (i−1)i, costing j each time: i·(1 + 2 + … + (i−1)) ≈ i³/2 for each i. Σ i³/2 ≈ n⁴/8. The middle loop’s Σ i² = Θ(n³) tests are dominated. Θ(n⁴).',
  },
  {
    id: 'cx-q-frag-j-reset', topic: T, page: 'code-fragments', kind: 'multi', difficulty: 'medium',
    title: 'Where j lives',
    prompt: 'In `for i in 0..n-1: while j < n and ok(i, j): j += 1`, select every true statement (assume `ok` is O(1)).',
    options: [
      'If j is initialised once, before the for loop, the total cost is Θ(n) in the worst case',
      'If j is reset to 0 at the start of every i, the worst case is Θ(n²)',
      'The cost is always Θ(n²) because there are two nested loops',
      'With j initialised once, the while body runs at most n times in total',
    ],
    answers: [0, 1, 3],
    explain: 'j only moves forward and is capped at n, so over the whole run its while body executes ≤ n times: Θ(n) total (amortized). Resetting j each iteration allows n steps per i: Θ(n²). Indentation alone decides nothing.',
  },
  {
    id: 'cx-q-frag-popcount', topic: T, page: 'code-fragments', kind: 'numeric', difficulty: 'medium',
    title: 'Clearing low bits',
    prompt: 'How many iterations does `while (x) x &= x - 1;` make for x = 45?',
    answer: 4,
    explain: '45 = 101101₂ has four 1-bits. x & (x − 1) clears the lowest set bit, so the loop runs popcount(x) = 4 times — at most log₂ x + 1 for any x.',
  },
  {
    id: 'cx-q-frag-match-rec', topic: T, page: 'code-fragments', kind: 'match', difficulty: 'medium',
    title: 'Recursion shapes',
    prompt: 'Match each recursive function with its running time.',
    left: ['f(n): f(n/2)', 'f(n): f(n/2); f(n/2)', 'f(n): loop n; f(n/2)', 'f(n): f(n−1); f(n−1)', 'f(n): for i < n: f(n−1)'],
    right: ['Θ(log n)', 'Θ(n) — n leaves', 'Θ(n) — geometric', 'Θ(2ⁿ)', 'Θ(n!)'],
    explain: 'T(n/2)+1 → log n; 2T(n/2)+1 → a full binary tree with n leaves; T(n/2)+n → n + n/2 + … < 2n; 2T(n−1)+1 → 2ⁿ; n·T(n−1) → n!.',
  },
  {
    id: 'cx-q-frag-euclid', topic: T, page: 'code-fragments', kind: 'mcq', difficulty: 'medium',
    title: 'Why Euclid is fast',
    prompt: 'Which fact gives Euclid’s algorithm its O(log a) iteration bound?',
    options: [
      'a mod b < a/2 whenever a ≥ b > 0, so the larger number halves every two iterations',
      'b is halved in every iteration',
      'gcd(a, b) ≤ min(a, b)',
      'The quotient a / b is always at least 2',
    ],
    answer: 0,
    explain: 'If b ≤ a/2 then a mod b < b ≤ a/2; otherwise a mod b = a − b < a/2. Two iterations replace a by a mod b, so a halves at least every two steps: ≤ 2 log₂ a + 1 iterations. b need not halve in one step (Fibonacci inputs).',
  },
  {
    id: 'cx-q-frag-blocks', topic: T, page: 'code-fragments', kind: 'numeric', difficulty: 'hard',
    title: 'Distinct quotients',
    prompt: 'How many **distinct** values does $\\lfloor 30 / i \\rfloor$ take for $i = 1, 2, \\ldots, 30$?',
    answer: 10,
    explain: 'The values are 30, 15, 10, 7, 6, 5, 4, 3, 2, 1 — ten of them, below 2√30 ≈ 10.95. The block loop makes one iteration per distinct value.',
  },
  {
    id: 'cx-q-frag-fill-loglog', topic: T, page: 'code-fragments', kind: 'fill', difficulty: 'medium',
    title: 'Make it log log n',
    prompt: 'Fill the update so the loop runs Θ(log log n) times.',
    code: `
long long i = 2;
int steps = 0;
while (i < n) {
    i = [[0]];
    steps++;
}`,
    lang: 'cpp',
    blanks: [['i*i', 'i * i']],
    explain: 'Squaring doubles the exponent: i = 2^(2^k) after k steps, which reaches n when 2^k ≥ log₂ n, i.e. k ≈ log₂ log₂ n. (Doubling, i*2, would give log n.)',
  },

  // ── Estimating runtime
  {
    id: 'cx-q-est-budget', topic: T, page: 'estimating-runtime', kind: 'multi', difficulty: 'easy',
    title: 'What fits for n = 10⁶?',
    prompt: 'With n = 10⁶ and a 1-second limit in C++, which complexities are safe? Select all.',
    options: ['O(n)', 'O(n log n)', 'O(n √n)', 'O(n²)'],
    answers: [0, 1],
    explain: 'n = 10⁶, n log n ≈ 2·10⁷: fine. n√n = 10⁹: ~10 s at 10⁸ ops/s — too slow. n² = 10¹²: hopeless.',
  },
  {
    id: 'cx-q-est-sum-n', topic: T, page: 'estimating-runtime', kind: 'mcq', difficulty: 'medium',
    title: 'The per-test reset',
    prompt: 'There are up to 10⁴ test cases and the sum of n over all tests is ≤ 2·10⁵. Your O(n) solution starts each test by zeroing a global array of size 2·10⁵. What happens?',
    options: [
      'Nothing — clearing memory is free',
      'It is still O(sum of n), so it passes',
      'The clearing alone costs about 2·10⁹ operations — likely time limit exceeded',
      'It runs out of memory',
    ],
    answer: 2,
    explain: '10⁴ tests × 2·10⁵ = 2·10⁹ writes, regardless of how small each test is. Clear only the first n entries (or allocate per test, sized n) so the work stays proportional to the sum of n.',
  },
  {
    id: 'cx-q-est-memory', topic: T, page: 'estimating-runtime', kind: 'numeric', difficulty: 'easy',
    title: 'How big is the table?',
    prompt: 'How many megabytes (10⁶ bytes) does a 4000 × 4000 array of 8-byte `long long` use?',
    answer: 128,
    tolerance: 2,
    explain: '4000² = 1.6·10⁷ cells × 8 bytes = 1.28·10⁸ bytes = 128 MB. Fine under 256 MB, but a second table like it would not be.',
  },
  {
    id: 'cx-q-est-doubling', topic: T, page: 'estimating-runtime', kind: 'numeric', difficulty: 'medium',
    title: 'Read the exponent',
    prompt: 'A program takes 0.5 s at n = 10⁴ and 4.0 s at n = 2·10⁴. If T(n) ≈ a·nᵇ, what is b?',
    answer: 3,
    explain: 'T(2n)/T(n) = 4.0/0.5 = 8 = 2ᵇ, so b = log₂ 8 = 3: cubic.',
  },
  {
    id: 'cx-q-est-mitm', topic: T, page: 'estimating-runtime', kind: 'mcq', difficulty: 'medium',
    title: 'n ≤ 40',
    prompt: 'A subset problem has n ≤ 40. Trying all 2⁴⁰ ≈ 10¹² subsets is too slow. Which complexity is the setter likely hinting at?',
    options: ['O(n!)', 'O(2^(n/2)·n) — meet in the middle', 'O(n³)', 'O(log n)'],
    answer: 1,
    explain: '2²⁰ ≈ 10⁶, so splitting into two halves of 20, enumerating each, and combining with sorting/binary search costs about 2²⁰·20 ≈ 2·10⁷. n ≈ 40 is the signature limit of meet in the middle.',
  },
  {
    id: 'cx-q-est-python', topic: T, page: 'estimating-runtime', kind: 'mcq', difficulty: 'easy',
    title: 'Python’s budget',
    prompt: 'Roughly how long do 10⁸ simple loop iterations take in pure CPython?',
    options: ['About 0.1 second', 'About 1 second', 'Tens of seconds', 'Exactly the same as C++'],
    answer: 2,
    explain: 'CPython executes on the order of 10⁶–10⁷ simple operations per second, so 10⁸ iterations take tens of seconds. Plan for ~10⁷ operations per second at best, and lean on built-ins (sum, sort, set) that run in C.',
  },
  {
    id: 'cx-q-est-nsqrt', topic: T, page: 'estimating-runtime', kind: 'numeric', difficulty: 'easy',
    title: 'n√n',
    prompt: 'For n = 10⁵, how many operations is n·√n, approximately? Answer in millions (e.g. 32 for 3.2·10⁷).',
    answer: 32,
    tolerance: 1.5,
    explain: '√(10⁵) ≈ 316, so n√n ≈ 3.16·10⁷ ≈ 32 million — fine in C++, which is why sqrt decomposition works for n ≈ 10⁵.',
  },
]
