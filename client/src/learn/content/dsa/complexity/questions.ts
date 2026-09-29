import type { Question } from '../../../questions/types'

const T = 'complexity'

const concept: Question[] = [
  // ── Why count steps
  {
    id: 'cx-q-why-not-time', topic: T, page: 'why-measure', kind: 'multi', difficulty: 'easy',
    title: 'Why not just time it?',
    prompt: 'Which of these make stopwatch timings a poor way to compare two **algorithms**? Select all that apply.',
    options: ['The result depends on the machine', 'The result depends on the programming language', 'Small test inputs can hide how the time grows', 'Timings are always identical for inputs of the same size'],
    answers: [0, 1, 2],
    explain: 'Hardware, language and input size all change measured time without changing the algorithm. And inputs of the same size can take very different time (best vs worst case), so the last statement is false.',
  },
  {
    id: 'cx-q-count-test', topic: T, page: 'why-measure', kind: 'numeric', difficulty: 'easy',
    title: 'How many tests?',
    prompt: 'In `i = 0; while (i < n) { …; i++; }` with n = 10, how many times is the condition `i < n` evaluated?',
    answer: 11,
    hint: 'The loop needs one test that fails in order to stop.',
    explain: 'It is true for i = 0…9 (10 times) and false once for i = 10: n + 1 = 11 tests.',
  },
  {
    id: 'cx-q-count-ops', topic: T, page: 'why-measure', kind: 'numeric', difficulty: 'medium',
    title: 'Count the operations',
    prompt: 'Using the lesson’s counting (each assignment, test, addition and increment = 1), how many operations does the sum loop perform for n = 20?',
    answer: 63,
    explain: 'T(n) = 3n + 3 → 3·20 + 3 = 63.',
  },
  {
    id: 'cx-q-input-size', topic: T, page: 'why-measure', kind: 'mcq', difficulty: 'medium',
    title: 'What is n here?',
    prompt: 'An algorithm adds two big integers digit by digit. The integers are up to $10^{1000}$. What is the natural input size?',
    options: ['The value, about $10^{1000}$', 'The number of digits, about 1000', 'Always 2, because there are two numbers', 'The sum of the two values'],
    answer: 1,
    explain: 'The loop runs once per digit, so the work is proportional to the number of digits — log₁₀ of the value. Using the value itself as n would wildly overstate the cost.',
  },
  {
    id: 'cx-q-two-sizes', topic: T, page: 'why-measure', kind: 'mcq', difficulty: 'easy',
    title: 'Two inputs',
    prompt: 'For every element of array A (size n) we scan all of array B (size m). The complexity is…',
    options: ['O(n)', 'O(n²)', 'O(n · m)', 'O(n + m)'],
    answer: 2,
    explain: 'The inner scan costs m and runs n times. Writing O(n²) would be wrong unless m and n are the same size.',
  },
  {
    id: 'cx-q-fill-count', topic: T, page: 'why-measure', kind: 'fill', difficulty: 'easy',
    title: 'Fill in the counts',
    prompt: 'Fill in how many times each line runs for an array of length n (write it in terms of n).',
    code: `
s = 0                   # runs 1 time
i = 0                   # runs 1 time
while i < n:            # runs [[0]] times
    s += arr[i]         # runs [[1]] times
    i += 1              # runs n times`,
    blanks: [['n + 1', 'n+1', '1 + n'], ['n']],
    explain: 'The test runs n + 1 times (the last one fails); the body runs n times.',
  },

  // ── Big-O
  {
    id: 'cx-q-bigo-def', topic: T, page: 'big-o', kind: 'mcq', difficulty: 'easy',
    title: 'What Big-O promises',
    prompt: '$f(n) = O(g(n))$ means…',
    options: [
      'f(n) ≤ c · g(n) for all n ≥ n₀, for some constants c > 0 and n₀',
      'f(n) = g(n) for large n',
      'f(n) ≥ c · g(n) for all large n',
      'f(n) < g(n) for every n',
    ],
    answer: 0,
    explain: 'Big-O is an upper bound up to a constant factor, from some point n₀ on. The third option is Big-Ω.',
  },
  {
    id: 'cx-q-bigo-c', topic: T, page: 'big-o', kind: 'numeric', difficulty: 'medium',
    title: 'Find n₀',
    prompt: 'To prove $5n + 20 = O(n)$ with $c = 6$, what is the smallest $n_0$ for which $5n + 20 \\le 6n$ holds for all $n \\ge n_0$?',
    answer: 20,
    explain: '5n + 20 ≤ 6n ⇔ 20 ≤ n. So n₀ = 20.',
  },
  {
    id: 'cx-q-loose', topic: T, page: 'big-o', kind: 'mcq', difficulty: 'medium',
    title: 'True but loose',
    prompt: 'Linear search does at most n comparisons. Which statement is **true**?',
    options: ['It is O(n) but not O(n²)', 'It is O(n) and also O(n²)', 'It is O(n²) but not O(n)', 'It is O(log n)'],
    answer: 1,
    explain: 'Big-O is only an upper bound, so anything O(n) is also O(n²), O(n³)… — true but loose. The useful statement is the tight one, Θ(n) in the worst case.',
  },
  {
    id: 'cx-q-simplify', topic: T, page: 'big-o', kind: 'text', difficulty: 'easy',
    title: 'Simplify',
    prompt: 'Simplify $7n^2 + 3n\\log n + 100$ in Big-O notation (write it like `O(n^2)`).',
    accept: ['O(n^2)', 'O(n²)', 'O(n*n)', 'O(n2)', 'n^2', 'n²'],
    explain: 'Keep the fastest-growing term and drop its constant: O(n²).',
  },
  {
    id: 'cx-q-theta', topic: T, page: 'big-o', kind: 'multi', difficulty: 'medium',
    title: 'Which are Θ(n)?',
    prompt: 'Select every function that is $\\Theta(n)$.',
    options: ['$3n + 7$', '$n/100$', '$n \\log n$', '$\\sqrt{n} + n$', '$1000$'],
    answers: [0, 1, 3],
    explain: 'Constant factors and smaller terms do not matter: 3n + 7, n/100 and n + √n are all Θ(n). n log n grows faster; 1000 is Θ(1).',
  },
  {
    id: 'cx-q-log-base', topic: T, page: 'big-o', kind: 'mcq', difficulty: 'easy',
    title: 'Log bases',
    prompt: 'Is $O(\\log_2 n)$ the same class as $O(\\log_{10} n)$?',
    options: ['Yes — they differ by a constant factor', 'No — log₂ n is much larger', 'Only for n a power of 10', 'No — log₁₀ n is O(1)'],
    answer: 0,
    explain: 'log₂ n = log₁₀ n / log₁₀ 2 ≈ 3.32 · log₁₀ n. A constant factor, so the same class — which is why we just write O(log n).',
  },
  {
    id: 'cx-q-exp-base', topic: T, page: 'big-o', kind: 'mcq', difficulty: 'medium',
    title: 'Exponent bases',
    prompt: 'Is $3^n = O(2^n)$?',
    options: ['Yes, constants do not matter', 'No — 3ⁿ / 2ⁿ = 1.5ⁿ grows without bound', 'Yes, both are exponential', 'Only for small n'],
    answer: 1,
    explain: 'The ratio 1.5ⁿ is not bounded by any constant, so 3ⁿ is not O(2ⁿ). Unlike log bases, exponential bases change the class.',
  },
  {
    id: 'cx-q-match-notation', topic: T, page: 'big-o', kind: 'match', difficulty: 'medium',
    title: 'Match the notation',
    prompt: 'Match each notation with its meaning.',
    left: ['f = O(g)', 'f = Ω(g)', 'f = Θ(g)', 'f = o(g)'],
    right: ['f grows no faster than g', 'f grows at least as fast as g', 'f grows exactly as fast as g', 'f grows strictly slower than g'],
    explain: 'O is ≤, Ω is ≥, Θ is both, little-o is strict: f(n)/g(n) → 0.',
  },

  // ── Loops
  {
    id: 'cx-q-seq-loops', topic: T, page: 'loops', kind: 'mcq', difficulty: 'easy',
    title: 'One loop after another',
    prompt: 'Code runs a loop of n iterations, then a separate loop of n iterations, then a third one of n. Complexity?',
    options: ['O(n³)', 'O(3n) — which is O(n)', 'O(n²)', 'O(log n)'],
    answer: 1,
    explain: 'Sequence adds: n + n + n = 3n = O(n). Only nesting multiplies.',
  },
  {
    id: 'cx-q-nested-count', topic: T, page: 'loops', kind: 'numeric', difficulty: 'easy',
    title: 'Count the body',
    prompt: 'How many times does `count++` run?\n\n```\nfor (i = 0; i < 12; i++)\n  for (j = 0; j < 5; j++)\n    count++;\n```',
    answer: 60,
    explain: '12 outer iterations × 5 inner = 60.',
  },
  {
    id: 'cx-q-triangle-count', topic: T, page: 'loops', kind: 'numeric', difficulty: 'medium',
    title: 'The triangle',
    prompt: 'How many times does the body run for n = 10?\n\n```\nfor i in range(n):\n    for j in range(i + 1, n):\n        body()\n```',
    answer: 45,
    hint: 'Row i has n − 1 − i iterations.',
    explain: '9 + 8 + … + 1 + 0 = n(n − 1)/2 = 10 · 9 / 2 = 45.',
  },
  {
    id: 'cx-q-nm', topic: T, page: 'loops', kind: 'mcq', difficulty: 'medium',
    title: 'Different sizes',
    prompt: 'A string s has length n and a list of words has m entries. For every word we check whether it occurs in s with a scan that costs O(n). What is the total?',
    options: ['O(n + m)', 'O(n · m)', 'O(n²)', 'O(m²)'],
    answer: 1,
    explain: 'm checks of O(n) each: O(n · m).',
  },
  {
    id: 'cx-q-hidden-in', topic: T, page: 'loops', kind: 'mcq', difficulty: 'medium',
    title: 'The hidden loop',
    prompt: 'What is the complexity of this Python function for a list of length n?\n\n```python\ndef uniques(a):\n    out = []\n    for x in a:\n        if x not in out:\n            out.append(x)\n    return out\n```',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'],
    answer: 2,
    explain: '`x not in out` scans the list `out` — up to n elements. Inside a loop of n iterations that is O(n²). A set would make it O(n).',
  },
  {
    id: 'cx-q-const-inner', topic: T, page: 'loops', kind: 'mcq', difficulty: 'easy',
    title: 'A constant inner loop',
    prompt: 'For each of the n cells of a grid we look at its 4 neighbours. Complexity?',
    options: ['O(n²)', 'O(4ⁿ)', 'O(n)', 'O(n log n)'],
    answer: 2,
    explain: 'The inner loop runs a fixed 4 times: 4n = O(n). A constant-size inner loop does not add a dimension.',
  },
  {
    id: 'cx-q-loop-order', topic: T, page: 'loops', kind: 'order', difficulty: 'medium',
    title: 'Order by growth',
    prompt: 'Order these loop shapes from the **fewest** body executions to the **most**, for large n.',
    items: [
      '`for (i = n; i > 1; i /= 2)`',
      '`for (i = 0; i < n; i += 5)`',
      '`for i in 0..n-1: for j in i+1..n-1`',
      '`for i in 0..n-1: for j in 0..n-1: for k in 0..n-1`',
    ],
    explain: 'log n < n/5 < n(n − 1)/2 < n³.',
  },
  {
    id: 'cx-q-fill-triangle', topic: T, page: 'loops', kind: 'fill', difficulty: 'medium',
    title: 'Closed form',
    prompt: 'Complete the closed form of the triangular sum (use `n`).',
    code: `
1 + 2 + 3 + … + n  =  [[0]]
0 + 1 + 2 + … + (n − 1)  =  [[1]]`,
    blanks: [['n(n+1)/2', 'n*(n+1)/2', '(n*(n+1))/2', 'n(n + 1)/2'], ['n(n-1)/2', 'n*(n-1)/2', '(n*(n-1))/2', 'n(n−1)/2']],
    explain: 'Pair the first and last terms: n/2 pairs each summing to n + 1 gives n(n + 1)/2. The second sum has n − 1 as its last term: (n − 1)n/2.',
  },

  // ── Logarithms
  {
    id: 'cx-q-log-values', topic: T, page: 'logarithms', kind: 'numeric', difficulty: 'easy',
    title: 'log₂ of a million',
    prompt: 'Roughly how many times can you halve 1 000 000 before it drops to 1? (Give the nearest integer.)',
    answer: 20,
    tolerance: 0,
    explain: '2²⁰ = 1 048 576 ≈ 10⁶, so log₂ 10⁶ ≈ 19.9 — about 20 halvings.',
  },
  {
    id: 'cx-q-halving-count', topic: T, page: 'logarithms', kind: 'numeric', difficulty: 'medium',
    title: 'Trace the halving loop',
    prompt: 'How many times does the body run?\n\n```\nn = 100\nwhile n > 1:\n    n = n // 2\n```',
    answer: 6,
    explain: '100 → 50 → 25 → 12 → 6 → 3 → 1: six halvings. ⌊log₂ 100⌋ = 6.',
  },
  {
    id: 'cx-q-doubling', topic: T, page: 'logarithms', kind: 'mcq', difficulty: 'easy',
    title: 'Doubling',
    prompt: 'What is the complexity of `for (i = 1; i < n; i *= 2) sum += i;`?',
    options: ['O(n)', 'O(log n)', 'O(n / 2)', 'O(2ⁿ)'],
    answer: 1,
    explain: 'i takes the values 1, 2, 4, …, reaching n after about log₂ n doublings.',
  },
  {
    id: 'cx-q-log-nested', topic: T, page: 'logarithms', kind: 'mcq', difficulty: 'medium',
    title: 'Linear inside logarithmic',
    prompt: '```\nfor (i = n; i >= 1; i /= 2)\n    for (j = 0; j < n; j++)\n        work();\n```\nComplexity?',
    options: ['O(n)', 'O(log n)', 'O(n log n)', 'O(n²)'],
    answer: 2,
    explain: 'The outer loop runs about log₂ n times; each time the inner loop does n work: n log n.',
  },
  {
    id: 'cx-q-harmonic', topic: T, page: 'logarithms', kind: 'mcq', difficulty: 'hard',
    title: 'The sieve shape',
    prompt: '```\nfor (i = 1; i <= n; i++)\n    for (j = i; j <= n; j += i)\n        work();\n```\nComplexity?',
    options: ['O(n²)', 'O(n log n)', 'O(n)', 'O(n √n)'],
    answer: 1,
    explain: 'The inner loop runs n/i times: n(1 + 1/2 + … + 1/n) = n · Hₙ ≈ n ln n.',
  },
  {
    id: 'cx-q-log-square', topic: T, page: 'logarithms', kind: 'mcq', difficulty: 'medium',
    title: 'log of a square',
    prompt: 'Is $O(\\log(n^2))$ bigger than $O(\\log n)$?',
    options: ['Yes, it is O(log² n)', 'No — log(n²) = 2 log n, the same class', 'Yes, it is O(n)', 'It is O(1)'],
    answer: 1,
    explain: 'log(n²) = 2 log n. The factor 2 is a constant. (Do not confuse with log² n = (log n)², which is bigger.)',
  },
  {
    id: 'cx-q-while-div3', topic: T, page: 'logarithms', kind: 'numeric', difficulty: 'medium',
    title: 'Dividing by 3',
    prompt: 'How many times does the body run for n = 81?\n\n```\nwhile n > 1:\n    n = n // 3\n```',
    answer: 4,
    explain: '81 → 27 → 9 → 3 → 1: four steps, log₃ 81 = 4. Still O(log n).',
  },
  {
    id: 'cx-q-fill-pow', topic: T, page: 'logarithms', kind: 'fill', difficulty: 'hard',
    title: 'Complete fast power',
    prompt: 'Complete the O(log b) exponentiation.',
    code: `
r = 1
while b > 0:
    if b & 1:
        r = r * a % m
    a = [[0]] % m
    b = [[1]]`,
    blanks: [['a * a', 'a*a', 'a ** 2'], ['b >> 1', 'b // 2', 'b>>1', 'b//2']],
    hint: 'aᵇ = (a²)^(b/2) when b is even.',
    explain: 'Square the base and halve the exponent. The exponent loses one bit per iteration, so about log₂ b iterations.',
  },

  // ── Growth classes
  {
    id: 'cx-q-ladder', topic: T, page: 'growth-classes', kind: 'order', difficulty: 'easy',
    title: 'Climb the ladder',
    prompt: 'Order from slowest-growing to fastest-growing.',
    items: ['O(log n)', 'O(√n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)', 'O(n!)'],
    explain: 'log n < √n < n < n log n < n² < 2ⁿ < n!.',
  },
  {
    id: 'cx-q-constraint-2e5', topic: T, page: 'growth-classes', kind: 'mcq', difficulty: 'easy',
    title: 'n ≤ 2·10⁵',
    prompt: 'A problem has n ≤ 2·10⁵ and a 1-second limit. Which complexity should you aim for?',
    options: ['O(n²)', 'O(n log n) or better', 'O(2ⁿ)', 'O(n³)'],
    answer: 1,
    explain: 'n² = 4·10¹⁰ — hundreds of seconds. n log n ≈ 3.6·10⁶ — milliseconds.',
  },
  {
    id: 'cx-q-constraint-20', topic: T, page: 'growth-classes', kind: 'mcq', difficulty: 'medium',
    title: 'n ≤ 20',
    prompt: 'The limits say n ≤ 20. What does that hint at?',
    options: ['A formula in O(1)', 'Trying all subsets, O(2ⁿ · n)', 'Binary search', 'An O(n log n) sort'],
    answer: 1,
    explain: '2²⁰ ≈ 10⁶ subsets — tiny. Such small limits usually mean the intended solution is exponential.',
  },
  {
    id: 'cx-q-constraint-1e12', topic: T, page: 'growth-classes', kind: 'mcq', difficulty: 'medium',
    title: 'n ≤ 10¹²',
    prompt: 'You must answer a question about one number n ≤ 10¹². Which is fast enough?',
    options: ['O(n)', 'O(√n)', 'O(n log n)', 'O(n²)'],
    answer: 1,
    explain: '√10¹² = 10⁶ steps. O(n) would need 10¹² — far too slow.',
  },
  {
    id: 'cx-q-ops-estimate', topic: T, page: 'growth-classes', kind: 'numeric', difficulty: 'medium',
    title: 'Estimate the seconds',
    prompt: 'An O(n²) algorithm runs on n = 10⁵ at 10⁸ operations per second. About how many **seconds** does it take?',
    answer: 100,
    tolerance: 0.5,
    explain: '(10⁵)² = 10¹⁰ operations ÷ 10⁸ per second = 100 seconds.',
  },
  {
    id: 'cx-q-double-speed', topic: T, page: 'growth-classes', kind: 'mcq', difficulty: 'hard',
    title: 'A computer twice as fast',
    prompt: 'On a computer twice as fast, in the same time, how much larger an input can an O(2ⁿ) algorithm handle?',
    options: ['Twice as large', '√2 times as large', 'Just one more element', 'Four times as large'],
    answer: 2,
    explain: '2^(n+1) = 2 · 2ⁿ: doubling the budget buys exactly one more element. For O(n) it would be twice as large, for O(n²) √2 times.',
  },
  {
    id: 'cx-q-match-constraints', topic: T, page: 'growth-classes', kind: 'match', difficulty: 'medium',
    title: 'Limits to complexity',
    prompt: 'Match each input limit with the complexity that usually fits in one second.',
    left: ['n ≤ 10', 'n ≤ 500', 'n ≤ 5000', 'n ≤ 10⁶', 'n ≤ 10¹⁸'],
    right: ['O(n!)', 'O(n³)', 'O(n²)', 'O(n log n)', 'O(log n)'],
    explain: '10! ≈ 3.6·10⁶, 500³ ≈ 1.25·10⁸, 5000² = 2.5·10⁷, 10⁶ · 20 = 2·10⁷, log 10¹⁸ ≈ 60.',
  },
  {
    id: 'cx-q-sqrt-why', topic: T, page: 'growth-classes', kind: 'mcq', difficulty: 'medium',
    title: 'Why stop at √n?',
    prompt: 'Why does trial division only need to test i with i · i ≤ n?',
    options: [
      'Every divisor i > √n pairs with n / i < √n, which was already found',
      'Numbers above √n are never divisors',
      'Because √n is always prime',
      'It is an approximation that is usually right',
    ],
    answer: 0,
    explain: 'Divisors come in pairs (i, n/i) and one of each pair is ≤ √n. So finding the small ones finds all of them.',
  },

  // ── Cases
  {
    id: 'cx-q-case-default', topic: T, page: 'cases', kind: 'mcq', difficulty: 'easy',
    title: 'The default case',
    prompt: 'When someone says "this algorithm is O(n log n)" without qualification, which case do they usually mean?',
    options: ['Best case', 'Worst case', 'Average over all inputs', 'The case with the smallest n'],
    answer: 1,
    explain: 'The worst case: a guarantee for every input.',
  },
  {
    id: 'cx-q-linear-avg', topic: T, page: 'cases', kind: 'numeric', difficulty: 'medium',
    title: 'Average comparisons',
    prompt: 'Linear search over n = 9 values; the target is present and equally likely to be at each position. What is the average number of comparisons?',
    answer: 5,
    explain: '(1 + 2 + … + 9) / 9 = 45 / 9 = 5 = (n + 1)/2.',
  },
  {
    id: 'cx-q-insertion-best', topic: T, page: 'cases', kind: 'mcq', difficulty: 'medium',
    title: 'Insertion sort’s best case',
    prompt: 'For which input does insertion sort run in O(n)?',
    options: ['A reverse-sorted array', 'An already sorted array', 'A random array', 'It never runs in O(n)'],
    answer: 1,
    explain: 'On sorted input each new element is already in place after one comparison: n − 1 comparisons in total.',
  },
  {
    id: 'cx-q-quick-worst', topic: T, page: 'cases', kind: 'mcq', difficulty: 'medium',
    title: 'Quicksort’s bad day',
    prompt: 'Quicksort always picks the first element as pivot. Which input triggers its O(n²) worst case?',
    options: ['A random array', 'An already sorted array', 'An array with all distinct values', 'An array of size 1'],
    answer: 1,
    explain: 'Each partition splits off just the pivot, leaving n − 1 elements: T(n) = T(n − 1) + n = Θ(n²). Random pivots avoid this.',
  },
  {
    id: 'cx-q-case-vs-bound', topic: T, page: 'cases', kind: 'mcq', difficulty: 'hard',
    title: 'Cases vs bounds',
    prompt: 'Which statement is correct?',
    options: [
      'Big-O is only for the worst case and Big-Ω only for the best case',
      'Each case (best, worst, average) is a function, and each can be described with O, Ω or Θ',
      'The best case is always Θ(1)',
      'The average case is always halfway between best and worst',
    ],
    answer: 1,
    explain: 'Cases select which inputs we analyse; the notations describe growth. "Insertion sort’s worst case is Θ(n²)" combines both.',
  },
  {
    id: 'cx-q-match-cases', topic: T, page: 'cases', kind: 'match', difficulty: 'medium',
    title: 'Worst cases',
    prompt: 'Match each algorithm with its **worst-case** time.',
    left: ['Binary search', 'Merge sort', 'Insertion sort', 'Hash table lookup'],
    right: ['O(log n)', 'O(n log n)', 'O(n²)', 'O(n)'],
    explain: 'Binary search halves; merge sort is always n log n; insertion sort is quadratic on reversed input; a hash lookup is O(n) if every key collides (O(1) on average).',
  },

  // ── Space
  {
    id: 'cx-q-aux', topic: T, page: 'space', kind: 'mcq', difficulty: 'easy',
    title: 'Auxiliary space',
    prompt: 'Reversing an array of n elements in place with two pointers uses how much extra space?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
    answer: 0,
    explain: 'Two indexes and one temporary for the swap, however large n is.',
  },
  {
    id: 'cx-q-rec-depth', topic: T, page: 'space', kind: 'numeric', difficulty: 'medium',
    title: 'Deepest stack',
    prompt: 'The recursive `sum(a, i)` from the lesson is called as `sum(a, 0)` on an array of 7 elements. How many frames are on the call stack at the deepest point?',
    answer: 8,
    explain: 'Calls for i = 0, 1, …, 7 are all pending when the base case i = 7 runs: n + 1 = 8.',
  },
  {
    id: 'cx-q-tree-depth', topic: T, page: 'space', kind: 'mcq', difficulty: 'hard',
    title: 'Many calls, little stack',
    prompt: 'A recursion makes two calls, each on size n − 1, down to size 0. It makes about 2ⁿ calls in total. How much stack space does it need?',
    options: ['O(2ⁿ)', 'O(n)', 'O(1)', 'O(n²)'],
    answer: 1,
    explain: 'Only one root-to-leaf path is on the stack at any moment; siblings run one after the other. Depth n → O(n) stack space.',
  },
  {
    id: 'cx-q-space-prefix', topic: T, page: 'space', kind: 'mcq', difficulty: 'easy',
    title: 'Prefix sums',
    prompt: 'A prefix-sum array for n values costs how much extra space?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    answer: 2,
    explain: 'It stores n + 1 numbers — O(n) — in exchange for O(1) range queries.',
  },
  {
    id: 'cx-q-space-matrix', topic: T, page: 'space', kind: 'numeric', difficulty: 'medium',
    title: 'How big is the table?',
    prompt: 'A DP table of 5000 × 5000 `int`s (4 bytes each). How many **megabytes** is that? (1 MB = 10⁶ bytes.)',
    answer: 100,
    tolerance: 0.5,
    explain: '25·10⁶ cells × 4 bytes = 10⁸ bytes = 100 MB — often over a 256 MB limit once you add a second table. O(n²) memory matters too.',
  },
  {
    id: 'cx-q-fill-space', topic: T, page: 'space', kind: 'fill', difficulty: 'easy',
    title: 'Label the space',
    prompt: 'Fill in the extra space of each version (write `O(1)` or `O(n)`).',
    code: `
def total_rec(a, i=0):        # extra space: [[0]]
    if i == len(a): return 0
    return a[i] + total_rec(a, i + 1)

def total_loop(a):            # extra space: [[1]]
    s = 0
    for x in a: s += x
    return s`,
    blanks: [['O(n)'], ['O(1)']],
    explain: 'The recursion keeps n + 1 frames alive at its deepest; the loop keeps one accumulator.',
  },

  // ── Amortized
  {
    id: 'cx-q-amort-def', topic: T, page: 'amortized', kind: 'mcq', difficulty: 'easy',
    title: 'What amortized means',
    prompt: '"push_back is O(1) amortized" means…',
    options: [
      'Every single push takes O(1)',
      'Any sequence of k pushes takes O(k) in total',
      'A random push takes O(1) on average',
      'Pushes are O(1) only for small arrays',
    ],
    answer: 1,
    explain: 'Amortized bounds the total over a sequence. Individual pushes can still cost O(n) when the buffer is copied.',
  },
  {
    id: 'cx-q-amort-total', topic: T, page: 'amortized', kind: 'numeric', difficulty: 'medium',
    title: 'Total cost of 8 pushes',
    prompt: 'Start from capacity 1 and double when full. Each push costs 1 for the write plus the number of elements copied. What is the total cost of 8 pushes?',
    answer: 15,
    explain: 'Copies happen at pushes 2, 3, 5 (copying 1, 2, 4 elements) = 7 copies. Plus 8 writes = 15. Under 3 · 8 = 24, as promised.',
  },
  {
    id: 'cx-q-amort-copies', topic: T, page: 'amortized', kind: 'mcq', difficulty: 'medium',
    title: 'Why the copies stay small',
    prompt: 'Why is the total copying for k pushes less than 2k?',
    options: [
      'Copies happen at sizes 1, 2, 4, …, and a geometric series sums to less than twice its last term',
      'The array never needs more than k copies',
      'Most languages do not really copy',
      'Because each copy is O(1)',
    ],
    answer: 0,
    explain: '1 + 2 + 4 + … + 2ʲ = 2ʲ⁺¹ − 1 < 2 · 2ʲ ≤ 2k.',
  },
  {
    id: 'cx-q-amort-plus-c', topic: T, page: 'amortized', kind: 'mcq', difficulty: 'hard',
    title: 'Growing by +100',
    prompt: 'A dynamic array grows by a fixed 100 slots whenever it is full. What is the amortized cost per push over k pushes?',
    options: ['O(1)', 'O(log k)', 'O(k)', 'O(k²)'],
    answer: 2,
    explain: 'A copy every 100 pushes, costing 100, 200, 300, …: about k²/200 total → O(k) per push. Only geometric growth gives O(1).',
  },
  {
    id: 'cx-q-amort-window', topic: T, page: 'amortized', kind: 'mcq', difficulty: 'medium',
    title: 'The window loop',
    prompt: 'A `for hi` loop over n elements contains `while (cond) lo++;`, and lo never decreases or exceeds n. Total complexity?',
    options: ['O(n²)', 'O(n)', 'O(n log n)', 'Depends on cond'],
    answer: 1,
    explain: 'lo can be incremented at most n times over the whole run, so all the while-iterations together are O(n). Total O(n) amortized.',
  },
  {
    id: 'cx-q-amort-vs-avg', topic: T, page: 'amortized', kind: 'mcq', difficulty: 'hard',
    title: 'Amortized vs average',
    prompt: 'Which is true?',
    options: [
      'Amortized cost relies on random inputs',
      'Amortized cost is a worst-case guarantee over any sequence of operations',
      'Amortized and average case are the same',
      'Amortized cost only applies to arrays',
    ],
    answer: 1,
    explain: 'No probability is involved: any sequence of k operations costs at most k times the amortized bound.',
  },

  // ── Recurrences
  {
    id: 'cx-q-rec-binary', topic: T, page: 'recurrences', kind: 'mcq', difficulty: 'easy',
    title: 'Binary search recurrence',
    prompt: 'Solve $T(n) = T(n/2) + 1$.',
    options: ['Θ(n)', 'Θ(log n)', 'Θ(n log n)', 'Θ(1)'],
    answer: 1,
    explain: 'One unit of work per halving, log₂ n halvings.',
  },
  {
    id: 'cx-q-rec-merge-levels', topic: T, page: 'recurrences', kind: 'numeric', difficulty: 'medium',
    title: 'Levels of the tree',
    prompt: 'Merge sort on n = 64 elements. How many levels does the recursion tree have, counting the root and the leaves?',
    answer: 7,
    explain: 'Sizes 64, 32, 16, 8, 4, 2, 1: log₂ 64 + 1 = 7 levels.',
  },
  {
    id: 'cx-q-master-case', topic: T, page: 'recurrences', kind: 'mcq', difficulty: 'hard',
    title: 'Master theorem',
    prompt: 'Solve $T(n) = 4T(n/2) + n$.',
    options: ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(n² log n)'],
    answer: 2,
    explain: 'a = 4, b = 2: n^(log₂ 4) = n². f(n) = n is polynomially smaller, so the leaves dominate: Θ(n²).',
  },
  {
    id: 'cx-q-rec-linear', topic: T, page: 'recurrences', kind: 'mcq', difficulty: 'medium',
    title: 'Subtract, do not divide',
    prompt: 'Solve $T(n) = T(n - 1) + n$, $T(1) = 1$.',
    options: ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(2ⁿ)'],
    answer: 2,
    explain: 'n + (n − 1) + … + 1 = n(n + 1)/2 = Θ(n²). (Selection sort and worst-case quicksort.)',
  },
  {
    id: 'cx-q-rec-2n', topic: T, page: 'recurrences', kind: 'mcq', difficulty: 'medium',
    title: 'Two calls on n − 1',
    prompt: 'Solve $T(n) = 2T(n - 1) + 1$.',
    options: ['Θ(n)', 'Θ(n²)', 'Θ(2ⁿ)', 'Θ(n log n)'],
    answer: 2,
    explain: 'Each level doubles the number of calls for n levels: 1 + 2 + 4 + … + 2ⁿ⁻¹ = 2ⁿ − 1. (Towers of Hanoi.)',
  },
  {
    id: 'cx-q-fib-calls', topic: T, page: 'recurrences', kind: 'numeric', difficulty: 'hard',
    title: 'Counting fib calls',
    prompt: 'How many calls in total does naive `fib(5)` make (including the call fib(5) itself)? fib(n) calls fib(n − 1) and fib(n − 2) when n ≥ 2.',
    answer: 15,
    hint: 'calls(0) = calls(1) = 1, calls(n) = 1 + calls(n − 1) + calls(n − 2).',
    explain: 'calls: 1, 1, 3, 5, 9, 15 for n = 0…5. With memoisation it would be 6 distinct values.',
  },
  {
    id: 'cx-q-match-recurrence', topic: T, page: 'recurrences', kind: 'match', difficulty: 'medium',
    title: 'Recurrence to solution',
    prompt: 'Match each recurrence with its solution.',
    left: ['T(n) = T(n/2) + 1', 'T(n) = 2T(n/2) + n', 'T(n) = T(n − 1) + 1', 'T(n) = 2T(n/2) + 1', 'T(n) = T(n/2) + n'],
    right: ['Θ(log n)', 'Θ(n log n)', 'Θ(n) — a path of n calls', 'Θ(n) — n leaves', 'Θ(n) — n + n/2 + n/4 + …'],
    explain: 'Halving with O(1) work → log n; balanced split with linear merge → n log n; a chain of n calls → n; a full binary tree with O(1) per node has about 2n nodes → n; a geometric series n + n/2 + … < 2n → n.',
  },
  {
    id: 'cx-q-master-karatsuba', topic: T, page: 'recurrences', kind: 'mcq', difficulty: 'hard',
    title: 'Three halves',
    prompt: 'Karatsuba multiplication satisfies $T(n) = 3T(n/2) + O(n)$. Which is its complexity?',
    options: ['Θ(n log n)', 'Θ(n^1.585)', 'Θ(n²)', 'Θ(n)'],
    answer: 1,
    explain: 'n^(log₂ 3) ≈ n^1.585 beats f(n) = n, so the leaves dominate (case 1): Θ(n^log₂3). Better than the schoolbook Θ(n²).',
  },

  // ── Hidden costs
  {
    id: 'cx-q-pop0', topic: T, page: 'hidden-costs', kind: 'mcq', difficulty: 'medium',
    title: 'Draining with pop(0)',
    prompt: '`while a: x = a.pop(0)` on a Python list of n elements costs…',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'],
    answer: 2,
    explain: 'Each pop(0) shifts the remaining elements: (n − 1) + (n − 2) + … = O(n²). A deque’s popleft is O(1).',
  },
  {
    id: 'cx-q-string-concat', topic: T, page: 'hidden-costs', kind: 'mcq', difficulty: 'medium',
    title: 'Building a string',
    prompt: 'In Java, `s = s + c` inside a loop that runs n times (one character each) costs in total…',
    options: ['O(n)', 'O(n²)', 'O(n log n)', 'O(1)'],
    answer: 1,
    explain: 'Strings are immutable; each concatenation copies the current string: 1 + 2 + … + n = O(n²). StringBuilder makes it O(n).',
  },
  {
    id: 'cx-q-in-list', topic: T, page: 'hidden-costs', kind: 'match', difficulty: 'easy',
    title: 'Membership costs',
    prompt: 'Match each membership test with its typical cost.',
    left: ['`x in some_list` (Python)', '`x in some_set` (Python)', '`std::set::count(x)` (C++)', '`binary_search` on a sorted vector'],
    right: ['O(n)', 'O(1) average', 'O(log n) — balanced tree', 'O(log n) — halving'],
    explain: 'Lists scan; hash sets hash; std::set is a red-black tree; binary search halves the range.',
  },
  {
    id: 'cx-q-slice-rec', topic: T, page: 'hidden-costs', kind: 'mcq', difficulty: 'hard',
    title: 'Recursion that slices',
    prompt: '```python\ndef total(a):\n    if not a: return 0\n    return a[0] + total(a[1:])\n```\nTime complexity for a list of length n?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'],
    answer: 2,
    explain: 'a[1:] copies n − 1, then n − 2, … elements: O(n²) total (and O(n²) memory churn). Pass an index instead.',
  },
  {
    id: 'cx-q-by-value', topic: T, page: 'hidden-costs', kind: 'mcq', difficulty: 'medium',
    title: 'Pass by value',
    prompt: 'In C++, `int f(vector<int> v, int i)` is called n times inside a loop with a vector of size n. The body of f is O(1). Total cost?',
    options: ['O(n)', 'O(n²) — each call copies the vector', 'O(1)', 'O(n log n)'],
    answer: 1,
    explain: 'Passing by value copies n elements per call. Use `const vector<int>&` to make each call O(1).',
  },
  {
    id: 'cx-q-match-containers', topic: T, page: 'hidden-costs', kind: 'match', difficulty: 'medium',
    title: 'Find a value',
    prompt: 'Match each container with the cost of **finding** a value in it.',
    left: ['Unsorted array', 'Sorted array', 'Balanced BST (`std::set`, `TreeSet`)', 'Hash set'],
    right: ['O(n) scan', 'O(log n) binary search', 'O(log n) tree walk', 'O(1) average'],
    explain: 'Scan, halve, walk down a balanced tree, or hash straight to the bucket.',
  },

  // ── Review
  {
    id: 'cx-q-review-1', topic: T, page: 'cheatsheet', kind: 'mcq', difficulty: 'medium',
    title: 'Review: mixed loops',
    prompt: '```\nfor (i = 0; i < n; i++) { … }        // O(1) body\nfor (i = 0; i < n; i++)\n    for (j = 1; j < n; j *= 2) { … }  // O(1) body\n```\nTotal?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
    answer: 1,
    explain: 'O(n) + O(n log n) = O(n log n).',
  },
  {
    id: 'cx-q-review-2', topic: T, page: 'cheatsheet', kind: 'numeric', difficulty: 'hard',
    title: 'Review: count exactly',
    prompt: 'How many times does the body run for n = 16?\n\n```\nfor (i = 1; i < n; i *= 2)\n    for (j = 0; j < i; j++)\n        body();\n```',
    answer: 15,
    hint: 'The inner loop runs i times, and i = 1, 2, 4, 8.',
    explain: '1 + 2 + 4 + 8 = 15 = n − 1. A geometric series — so this is O(n), not O(n log n)!',
  },
  {
    id: 'cx-q-review-3', topic: T, page: 'cheatsheet', kind: 'mcq', difficulty: 'medium',
    title: 'Review: which is fastest for large n?',
    prompt: 'Which running time is the **smallest** for very large n?',
    options: ['$n^{1.01}$', '$n \\log^2 n$', '$n \\sqrt{n}$', '$100 n \\log n$'],
    answer: 3,
    explain: 'n log n · 100 < n log² n (log grows) < n^1.01 (any polynomial power beats any power of log eventually) < n^1.5.',
  },
  {
    id: 'cx-q-review-4', topic: T, page: 'cheatsheet', kind: 'multi', difficulty: 'medium',
    title: 'Review: true statements',
    prompt: 'Select all true statements.',
    options: ['$n^2 = O(n^3)$', '$2^{n+1} = O(2^n)$', '$2^{2n} = O(2^n)$', '$\\log(n!) = \\Theta(n \\log n)$', '$n! = O(2^n)$'],
    answers: [0, 1, 3],
    explain: '2^(n+1) = 2 · 2ⁿ (constant factor). 2^(2n) = 4ⁿ is not O(2ⁿ). log n! ~ n log n by Stirling. n! grows faster than 2ⁿ.',
  },
  {
    id: 'cx-q-review-5', topic: T, page: 'cheatsheet', kind: 'order', difficulty: 'hard',
    title: 'Review: order the recurrences',
    prompt: 'Order these by their solution, smallest first.',
    items: ['T(n) = T(n/2) + 1', 'T(n) = T(n/2) + n', 'T(n) = 2T(n/2) + n', 'T(n) = T(n − 1) + n', 'T(n) = 2T(n − 1) + 1'],
    explain: 'log n < n < n log n < n² < 2ⁿ.',
  },
  {
    id: 'cx-q-review-6', topic: T, page: 'cheatsheet', kind: 'text', difficulty: 'medium',
    title: 'Review: name the class',
    prompt: 'A problem has n ≤ 10⁵ and your idea checks every pair. In one word, is this likely to pass a 1-second limit? (yes / no)',
    accept: ['no'],
    explain: 'n²/2 = 5·10⁹ pair checks — about 50 seconds. Look for O(n log n).',
  },
]

const code = (id: string, page: string, title: string, difficulty: Question['difficulty'], prompt: string): Question => ({
  id, topic: T, page, kind: 'code', difficulty, title, prompt, explain: '', slug: id,
})

const coding: Question[] = [
  code('cx-c-sum-n', 'why-measure', 'Sum 1 to n, modulo', 'easy', 'n up to 10¹⁸: a loop is hopeless, a formula is O(1). Mind the overflow.'),
  code('cx-c-distinct', 'loops', 'Count distinct values', 'easy', 'n up to 2·10⁵: replace the pairwise check with sorting.'),
  code('cx-c-pairs', 'loops', 'Count pairs with sum T', 'medium', 'Count i < j with aᵢ + aⱼ = T — without checking every pair.'),
  code('cx-c-halvings', 'logarithms', 'How many halvings?', 'easy', 'For each n ≤ 10¹⁸, how many times can you halve it before reaching 1?'),
  code('cx-c-powmod', 'logarithms', 'Fast modular power', 'medium', 'aᵇ mod m with b up to 10¹⁸ — O(log b) per query.'),
  code('cx-c-harmonic', 'logarithms', 'Sum of ⌊n / i⌋', 'hard', 'n up to 10¹²: group the i with equal quotients for O(√n).'),
  code('cx-c-divisors', 'growth-classes', 'Count the divisors', 'easy', 'n up to 10¹²: stop at √n.'),
  code('cx-c-prime', 'growth-classes', 'Prime or not', 'medium', 'Up to 20 numbers, each up to 10¹².'),
]

export const questions: Question[] = [...concept, ...coding]
