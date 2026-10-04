import type { Question } from '../../../questions/types'

const T = 'arrays'

/* Memory & cache · sorted search · amortized analysis · index-as-hash · sentinel */
export const questions2: Question[] = [
  // ── Memory and cache
  {
    id: 'arr-q-stack-overflow', topic: T, page: 'memory-and-cache', kind: 'mcq', difficulty: 'medium',
    title: 'The crash before main does anything',
    prompt: 'A C++ solution declares `int dp[3000][3000];` **inside** `main` and crashes immediately with a segmentation fault, before any output. Why?',
    options: [
      'The array (about 36 MB) is a local variable on the stack, which is usually only 1–8 MB',
      'C++ arrays cannot have more than 65 536 elements',
      'The array is not initialised, and reading garbage crashes',
      'Two-dimensional arrays must be allocated with new',
    ],
    answer: 0,
    explain: '3000 × 3000 × 4 bytes ≈ 36 MB of automatic (stack) storage overflows the stack. Declare it globally, make it static, or use a vector. Uninitialised values do not crash by themselves, and there is no 65 536 limit.',
  },
  {
    id: 'arr-q-cache-line-ints', topic: T, page: 'memory-and-cache', kind: 'numeric', difficulty: 'easy',
    title: 'One cache line',
    prompt: 'A cache line is 64 bytes. How many 8-byte `double` values arrive with a single line fetch?',
    answer: 8,
    explain: '64 / 8 = 8. That is why a sequential scan of doubles misses roughly once every 8 elements (once every 16 for 4-byte ints).',
  },
  {
    id: 'arr-q-row-misses', topic: T, page: 'memory-and-cache', kind: 'numeric', difficulty: 'medium',
    title: 'Misses in row order',
    prompt: 'A row-major 8 × 32 matrix of 4-byte ints starts at the beginning of a cache line. Lines are 64 bytes. Summing it in **row order** with a cold cache, how many cache misses occur?',
    answer: 16,
    explain: 'A line holds 16 ints. The matrix has 256 ints in 256 / 16 = 16 consecutive lines, and row order touches each line once, in sequence: 16 misses.',
  },
  {
    id: 'arr-q-col-misses', topic: T, page: 'memory-and-cache', kind: 'numeric', difficulty: 'hard',
    title: 'Misses in column order',
    prompt: 'Same 8 × 32 int matrix and 64-byte lines, but the cache holds only **4 lines** (least-recently-used eviction). Summing in **column order** (r is the inner loop), how many misses occur?',
    answer: 256,
    explain: 'Each column touches 8 rows, which live in 8 different lines. Only 4 fit, so by the time the next column revisits row 0’s line, it has been evicted (LRU cycles through 8 lines with 4 slots). Every one of the 256 accesses misses — 16× the row-order count.',
  },
  {
    id: 'arr-q-boxed', topic: T, page: 'memory-and-cache', kind: 'mcq', difficulty: 'medium',
    title: 'int[] vs ArrayList<Integer>',
    prompt: 'Summing ten million numbers in Java is several times faster with `int[]` than with `ArrayList<Integer>`. What is the main reason?',
    options: [
      'ArrayList.get is O(log n)',
      'The int[] stores the numbers contiguously; the ArrayList stores references to separate Integer objects, so each element costs an extra memory access (and unboxing)',
      'ArrayList re-sorts itself after every access',
      'int[] is stored on the stack',
    ],
    answer: 1,
    explain: 'ArrayList.get is O(1), but each element is a pointer to a boxed Integer elsewhere on the heap — poor locality plus unboxing. Java arrays always live on the heap, so "stack" is wrong.',
  },
  {
    id: 'arr-q-static-meaning', topic: T, page: 'memory-and-cache', kind: 'multi', difficulty: 'easy',
    title: 'Fixed size once created',
    prompt: 'Which of these have a capacity that is **fixed once created** (they cannot grow in place)? Select all.',
    options: ['Java `int[]`', 'C++ `std::vector<int>`', 'Python `list`', 'JavaScript `Int32Array`', 'C++ `std::array<int, 8>`'],
    answers: [0, 3, 4],
    explain: 'Java arrays, typed arrays and std::array are fixed-size. vector and list are dynamic arrays that reallocate as they grow.',
  },
  {
    id: 'arr-q-soa', topic: T, page: 'memory-and-cache', kind: 'mcq', difficulty: 'medium',
    title: 'Struct of arrays',
    prompt: 'A simulation stores 1 000 000 particles as an array of `{x, y, z, vx, vy, vz, mass, id}` (8 fields). A hot loop reads only `x`. Rewriting storage as eight separate arrays (one per field) speeds the loop up mainly because…',
    options: [
      'Separate arrays use less total memory',
      'Each cache line fetched by the loop is now full of x values instead of mostly unused fields',
      'The compiler cannot vectorise structs',
      'Arrays of structs are stored column-major',
    ],
    answer: 1,
    explain: 'With an array of structs, each 64-byte line holds two particles, of which the loop uses 2 of 16 values. With a separate x array, every byte fetched is used — up to 8× less memory traffic. Total memory is the same.',
  },

  // ── Searching (sentinel)
  {
    id: 'arr-q-sentinel', topic: T, page: 'searching', kind: 'mcq', difficulty: 'medium',
    title: 'After the sentinel loop',
    prompt: 'The sentinel search saves `last = a[n−1]`, writes `x` into `a[n−1]`, and loops `while a[i] != x: i++`. After restoring `a[n−1] = last`, why must it test `i < n − 1 or last == x` instead of just `i < n − 1`?',
    options: [
      'Because i can exceed n − 1',
      'Because if the loop stopped at n − 1, that might be the sentinel — or the real last element might genuinely equal x',
      'Because restoring a[n−1] changes i',
      'It does not need to; i < n − 1 is enough',
    ],
    answer: 1,
    explain: 'The loop always stops by n − 1 (the sentinel guarantees it). Stopping there is ambiguous: either x was absent, or x really was the last element. Checking `last == x` resolves it; testing i < n − 1 alone would miss a target in the last slot.',
  },

  // ── Sorted search
  {
    id: 'arr-q-bs-rounds', topic: T, page: 'sorted-search', kind: 'numeric', difficulty: 'easy',
    title: 'Worst-case rounds',
    prompt: 'Binary search on a sorted array of 1000 elements. At most how many elements does it compare with x (worst case)?',
    answer: 10,
    explain: '⌊log₂ 1000⌋ + 1 = 9 + 1 = 10: the range sizes go 1000, ≤ 500, ≤ 250, …, and it takes 10 halvings to reach 0.',
  },
  {
    id: 'arr-q-bs-invariant', topic: T, page: 'sorted-search', kind: 'mcq', difficulty: 'medium',
    title: 'The invariant',
    prompt: 'Which statement is the loop invariant that proves binary search correct?',
    options: [
      'a[lo] ≤ x ≤ a[hi] at every step',
      'If x occurs in the array, it occurs in a[lo..hi]',
      'lo and hi always differ by a power of two',
      'mid always points at x after the first round',
    ],
    answer: 1,
    explain: 'We only discard indices proven unable to hold x, so x (if present) is always inside [lo, hi]. When the range is empty, x is absent. The first option fails whenever x is absent or outside the array’s range.',
  },
  {
    id: 'arr-q-bs-trace', topic: T, page: 'sorted-search', kind: 'array', difficulty: 'medium',
    title: 'Which middles?',
    prompt: 'Binary search (closed range, `mid = (lo + hi) // 2`) looks for **10** in `[1, 4, 7, 10, 13, 16, 19, 22, 25]`. List the **indices** of mid in the order they are examined.',
    answer: [4, 1, 2, 3],
    explain: 'lo=0,hi=8 → mid 4 (13 > 10) → hi=3. mid 1 (4 < 10) → lo=2. mid 2 (7 < 10) → lo=3. mid 3 (10) → found.',
  },
  {
    id: 'arr-q-bs-overflow', topic: T, page: 'sorted-search', kind: 'mcq', difficulty: 'medium',
    title: 'A famous bug',
    prompt: 'In Java with `int lo, hi` both around 1.5 × 10⁹, which computation of the midpoint is correct?',
    options: ['(lo + hi) / 2', 'lo + (hi - lo) / 2', '(lo + hi) % 2', 'hi / 2 + lo'],
    answer: 1,
    explain: 'lo + hi overflows past 2³¹ − 1 and becomes negative. lo + (hi − lo)/2 never exceeds hi. ((lo + hi) >>> 1 also works in Java and JS.) hi/2 + lo is simply the wrong point.',
  },
  {
    id: 'arr-q-bs-infinite', topic: T, page: 'sorted-search', kind: 'mcq', difficulty: 'hard',
    title: 'Stuck forever',
    prompt: 'A variant uses `while (lo < hi) { mid = (lo + hi) / 2; if (a[mid] < x) lo = mid; else hi = mid; }`. On which situation does it loop forever?',
    options: ['When x is smaller than every element', 'When hi = lo + 1 and a[lo] < x', 'When the array has one element', 'Never'],
    answer: 1,
    explain: 'With hi = lo + 1, mid = lo. If a[lo] < x, it sets lo = mid = lo — no progress, forever. The fix is lo = mid + 1 (mid is already known to be too small).',
  },
  {
    id: 'arr-q-sort-then-search', topic: T, page: 'sorted-search', kind: 'mcq', difficulty: 'medium',
    title: 'Sort first?',
    prompt: 'An unsorted array has n = 10⁶ values. You must answer q = 10⁵ "is x present?" queries, and you need no ordering information. Which is the best plan?',
    options: [
      'Linear search per query: O(n·q)',
      'Sort once, then binary search each query: O((n + q) log n) — or a hash set at O(n + q) average',
      'Sort before every query',
      'Binary search the unsorted array directly',
    ],
    answer: 1,
    explain: 'n·q = 10¹¹ is hopeless. Sorting once (~2·10⁷ steps) plus 10⁵ × 20 comparisons is tiny; a hash set is also fine. Binary search on unsorted data gives wrong answers.',
  },
  {
    id: 'arr-q-early-exit', topic: T, page: 'sorted-search', kind: 'numeric', difficulty: 'easy',
    title: 'Early exit',
    prompt: 'The early-exit linear search scans `[1, 3, 5, 7, 9, 11, 13]` for **10**, stopping at the first element greater than 10. How many elements does it look at, including the one that stops it?',
    answer: 6,
    explain: 'It looks at 1, 3, 5, 7, 9 (all ≤ 10, none equal) and then 11 > 10, so it stops: 6 elements. It never reaches 13.',
  },

  // ── Amortized analysis
  {
    id: 'arr-q-am-total', topic: T, page: 'amortized-analysis', kind: 'numeric', difficulty: 'medium',
    title: 'Exact total cost',
    prompt: 'A dynamic array starts with capacity 1 and doubles when full. A write costs 1 and each element copied during a resize costs 1. What is the total cost of **9** pushes?',
    answer: 24,
    explain: 'Resizes happen on the pushes that find size 1, 2, 4, 8: copies 1 + 2 + 4 + 8 = 15. Writes: 9. Total 24 — under the 3n = 27 bound.',
  },
  {
    id: 'arr-q-am-potential', topic: T, page: 'amortized-analysis', kind: 'numeric', difficulty: 'easy',
    title: 'Evaluate the potential',
    prompt: 'With Φ = 2·size − cap, what is Φ for a dynamic array holding 6 elements with capacity 8?',
    answer: 4,
    explain: '2·6 − 8 = 4. Two more pushes raise it to 8 = cap, which is exactly what the next resize (copying 8 elements) will spend.',
  },
  {
    id: 'arr-q-am-resize-cost', topic: T, page: 'amortized-analysis', kind: 'numeric', difficulty: 'medium',
    title: 'One expensive push',
    prompt: 'The array holds 16 elements in capacity 16. What is the **actual** cost of the next push (copies + the write)?',
    answer: 17,
    explain: '16 copies into the new 32-slot buffer plus 1 write. Its amortized cost is still 3: Φ drops from 16 to 2, and 17 + (2 − 16) = 3.',
  },
  {
    id: 'arr-q-am-factor', topic: T, page: 'amortized-analysis', kind: 'mcq', difficulty: 'medium',
    title: 'Growth factor 1.5',
    prompt: 'A dynamic array grows by a factor 1.5 instead of 2. Roughly how many element copies per push does it do in the long run?',
    options: ['About 1.5', 'About 2', 'About 3', 'About log n'],
    answer: 2,
    explain: 'Copies form the geometric series n(1 + 1/α + 1/α² + …) = n·α/(α − 1) = n·1.5/0.5 = 3n. Still O(1) per push, in exchange for wasting at most a third of the buffer instead of half.',
  },
  {
    id: 'arr-q-am-additive', topic: T, page: 'amortized-analysis', kind: 'mcq', difficulty: 'medium',
    title: 'Grow by 1000 each time',
    prompt: 'A buffer grows by a constant 1000 slots whenever it is full. What is the total cost of n pushes?',
    options: ['Θ(n)', 'Θ(n log n)', 'Θ(n²)', 'Θ(n / 1000)'],
    answer: 2,
    explain: 'Resizes at 1000, 2000, 3000, … copy 1000 + 2000 + … ≈ n²/2000 elements: Θ(n²). The constant 1000 only shrinks the constant factor.',
  },
  {
    id: 'arr-q-am-thrash', topic: T, page: 'amortized-analysis', kind: 'mcq', difficulty: 'hard',
    title: 'Why not shrink at half?',
    prompt: 'A dynamic array doubles when full and halves when it becomes half full. Starting from size = capacity = n, what does the sequence push, pop, push, pop, … cost?',
    options: ['O(1) per operation', 'O(log n) per operation', 'Θ(n) per operation — every operation resizes', 'It cannot happen: halving never triggers'],
    answer: 2,
    explain: 'push: full → double to 2n, copy n. pop: size n = half of 2n → halve, copy n. Now full again; repeat. Every operation copies n elements. Shrinking at a quarter fixes it.',
  },
  {
    id: 'arr-q-am-quarter', topic: T, page: 'amortized-analysis', kind: 'numeric', difficulty: 'medium',
    title: 'Distance to the next shrink',
    prompt: 'With the quarter rule (halve when size ≤ cap/4), an array has just resized to capacity 64 and holds 32 elements. How many consecutive pops are needed until a pop triggers a shrink (count that pop)?',
    answer: 16,
    explain: 'A shrink happens when size ≤ 64/4 = 16. Going from 32 to 16 takes 16 pops; the 16th triggers it. A grow would need 32 pushes. Either way at least cap/4 cheap operations come first.',
  },
  {
    id: 'arr-q-am-vs-avg', topic: T, page: 'amortized-analysis', kind: 'multi', difficulty: 'hard',
    title: 'What "O(1) amortized" promises',
    prompt: 'push_back is O(1) amortized. Which statements are true? Select all.',
    options: [
      'Any sequence of n push_backs from empty takes O(n) total time',
      'Every single push_back takes O(1) time',
      'The bound holds even for the worst possible sequence of operations — no randomness is involved',
      'It is the same thing as average-case O(1) over random inputs',
    ],
    answers: [0, 2],
    explain: 'Amortized bounds the total of any sequence. One push can still cost O(n) (a resize), and it is not a probabilistic average.',
  },

  // ── Index as hash
  {
    id: 'arr-q-ih-xor', topic: T, page: 'index-as-hash', kind: 'numeric', difficulty: 'easy',
    title: 'Fold with XOR',
    prompt: 'Run the XOR method on `[3, 0, 1]` (n = 3): start `x = 3`, then for each i do `x ^= i ^ a[i]`. What is x at the end?',
    answer: 2,
    explain: 'x = 3; i=0: 3⊕0⊕3 = 0; i=1: 0⊕1⊕0 = 1; i=2: 1⊕2⊕1 = 2. And indeed 2 is the value missing from {0, 1, 3}.',
  },
  {
    id: 'arr-q-ih-sum-overflow', topic: T, page: 'index-as-hash', kind: 'mcq', difficulty: 'medium',
    title: 'Sum formula in 32 bits',
    prompt: 'In C, `int s = n * (n + 1) / 2;` with n = 100 000. What happens?',
    options: [
      'Correct: 5 000 050 000',
      'n·(n + 1) ≈ 10¹⁰ overflows 32-bit int (undefined behaviour) — compute in long long',
      'Integer division truncates the answer by one',
      'It is correct because the division happens first',
    ],
    answer: 1,
    explain: 'The multiplication happens first in int and overflows long before dividing. Cast to long long, or use XOR, which cannot overflow.',
  },
  {
    id: 'arr-q-ih-cyclic-swaps', topic: T, page: 'index-as-hash', kind: 'numeric', difficulty: 'medium',
    title: 'Counting swaps',
    prompt: 'How many swaps does cyclic sort perform on `[2, 3, 4, 5, 1]`?',
    answer: 4,
    explain: 'All five values form one cycle. i stays at 0: 2→[1], 3→[2], 4→[3], 5→[4], and then 1 is home: 4 swaps, i.e. n − 1 for a single cycle of length n.',
  },
  {
    id: 'arr-q-ih-cyclic-trace', topic: T, page: 'index-as-hash', kind: 'array', difficulty: 'medium',
    title: 'Two swaps in',
    prompt: 'Cyclic sort on `[4, 3, 1, 2]`. What does the array look like after the **first two** swaps?',
    answer: [3, 2, 1, 4],
    explain: 'a[0] = 4 goes home to index 3: [2, 3, 1, 4]. a[0] = 2 goes home to index 1: [3, 2, 1, 4]. (One more swap sends 3 home and finishes.)',
  },
  {
    id: 'arr-q-ih-infinite', topic: T, page: 'index-as-hash', kind: 'mcq', difficulty: 'hard',
    title: 'Spot the bug',
    prompt: 'A cyclic sort uses `if a[i] != i + 1: swap(a[i], a[a[i] − 1]) else: i += 1`. What happens on `[2, 2]`?',
    options: ['It sorts correctly', 'It loops forever, swapping the two 2s', 'It crashes with an index error', 'It returns [1, 2]'],
    answer: 1,
    explain: 'a[0] = 2 ≠ 1, so it swaps a[0] with a[1] — both are 2, nothing changes, and the test is true again. Compare the values (a[i] != a[a[i] − 1]) so a duplicate already at home stops the swapping.',
  },
  {
    id: 'arr-q-ih-fmp-range', topic: T, page: 'index-as-hash', kind: 'mcq', difficulty: 'medium',
    title: 'Where the answer lives',
    prompt: 'For an array of n integers, the first missing positive is always…',
    options: ['In 1…n', 'In 1…n + 1', 'In 0…n', 'Possibly larger than n + 1 if the array holds large values'],
    answer: 1,
    explain: 'n numbers can occupy at most n of the n + 1 values 1…n + 1, so one of them is missing. It is n + 1 exactly when the array holds every value 1…n. Large values never help, which is why they can be ignored.',
  },
  {
    id: 'arr-q-ih-fmp-answer', topic: T, page: 'index-as-hash', kind: 'numeric', difficulty: 'easy',
    title: 'First missing positive',
    prompt: 'What is the first missing positive of `[1, 2, 0, 4, 3, 6]`?',
    answer: 5,
    explain: 'n = 6, so only 1…6 matter. 1, 2, 3, 4 and 6 are present; 5 is the smallest absent.',
  },
  {
    id: 'arr-q-ih-mark', topic: T, page: 'index-as-hash', kind: 'array', difficulty: 'medium',
    title: 'After sign marking',
    prompt: 'Run the sign-marking duplicate finder on `[2, 1, 2]` (for each element: j = |a[i]| − 1; if a[j] < 0 report, else negate a[j]). What is the array afterwards?',
    answer: [-2, -1, 2],
    explain: 'i=0: |2| → j=1, a[1]=1 > 0 → negate: [2, −1, 2]. i=1: |−1| = 1 → j=0 → negate: [−2, −1, 2]. i=2: 2 → j=1, a[1] < 0 → report 2, no change.',
  },
  {
    id: 'arr-q-ih-mismatch', topic: T, page: 'index-as-hash', kind: 'numeric', difficulty: 'hard',
    title: 'Two equations, two unknowns',
    prompt: 'The array `[4, 1, 3, 4, 5]` should be 1…5 but has one duplicate d and one missing m. Using S − S_expected = d − m and Q − Q_expected = d² − m² (Q = sum of squares), compute **d + m**.',
    answer: 6,
    explain: 'S = 17, expected 15 → d − m = 2. Q = 16+1+9+16+25 = 67, expected 55 → d² − m² = 12. So d + m = 12 / 2 = 6, giving d = 4 and m = 2.',
  },
  {
    id: 'arr-q-ih-fill-fmp', topic: T, page: 'index-as-hash', kind: 'fill', difficulty: 'medium',
    title: 'Complete the placement loop',
    prompt: 'Fill in the condition that decides whether to swap in first-missing-positive.',
    code: `
i = 0
while i < n:
    v = a[i]
    if [[0]] and a[v - 1] != v:
        a[i], a[v - 1] = a[v - 1], v
    else:
        i += 1`,
    blanks: [['1 <= v <= n', '1<=v<=n', 'v >= 1 and v <= n', '0 < v <= n']],
    hint: 'Only some values have a home index at all.',
    explain: 'Only values in 1…n have a home slot (v − 1). Anything else is irrelevant to the answer and must be skipped — without the range check, a[v − 1] would be out of bounds.',
  },
]
