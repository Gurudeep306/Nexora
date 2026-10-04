import type { Question } from '../../../questions/types'

const T = 'arrays'

/* Prefix sums + hashing · difference arrays and 2D prefix sums */
export const questions3: Question[] = [
  {
    id: 'arr-q-ph-count', topic: T, page: 'prefix-hashing', kind: 'numeric', difficulty: 'medium',
    title: 'Count zero-sum subarrays',
    prompt: 'How many (non-empty, contiguous) subarrays of `[1, −1, 1, −1]` have sum **0**? (Hint: list the prefix sums.)',
    answer: 4,
    explain: 'Prefixes P = 0, 1, 0, 1, 0. A zero-sum subarray is a pair of equal prefixes: the three 0s give C(3,2) = 3 pairs and the two 1s give 1 pair — 4 in total: [1,−1] twice, [−1,1], and the whole array.',
  },
  {
    id: 'arr-q-ph-seed', topic: T, page: 'prefix-hashing', kind: 'mcq', difficulty: 'medium',
    title: 'The missing seed',
    prompt: 'A solution for "count subarrays with sum k" starts with an **empty** map instead of `{0: 1}`. On `a = [3, 4]`, `k = 7`, what does it return?',
    options: ['1 (correct)', '0 — the subarray starting at index 0 is missed', '2 — it double counts', 'It crashes'],
    answer: 1,
    explain: 'At r = 1, P = 7 and it looks up 7 − 7 = 0. Only the seed {0: 1} represents the empty prefix before index 0. Without it, every subarray that starts at index 0 is lost.',
  },
  {
    id: 'arr-q-ph-window-fails', topic: T, page: 'prefix-hashing', kind: 'mcq', difficulty: 'medium',
    title: 'Why not a sliding window?',
    prompt: 'Why can’t "count subarrays with sum exactly k" be solved with the shrink-from-the-left sliding window when the array contains negative numbers?',
    options: [
      'Windows cannot be counted, only measured',
      'With negatives, adding an element can lower the sum and removing one can raise it, so there is no safe rule for when to shrink',
      'Hash maps are always faster than windows',
      'The window would need O(n²) memory',
    ],
    answer: 1,
    explain: 'The window relies on monotonicity: extending only increases the sum, shrinking only decreases it. Negatives break both directions, so the window can skip valid subarrays.',
  },
  {
    id: 'arr-q-ph-longest', topic: T, page: 'prefix-hashing', kind: 'numeric', difficulty: 'medium',
    title: 'Longest with sum k',
    prompt: 'What is the length of the longest subarray of `[1, −1, 5, −2, 3]` with sum **3**?',
    answer: 4,
    explain: 'Prefixes 0, 1, 0, 5, 3, 6. At the prefix 3 (after index 3), the first prefix equal to 3 − 3 = 0 is at length 0, giving a[0..3] = 1 − 1 + 5 − 2 = 3 with length 4. Nothing longer works.',
  },
  {
    id: 'arr-q-ph-first-vs-last', topic: T, page: 'prefix-hashing', kind: 'mcq', difficulty: 'hard',
    title: 'Which index to remember?',
    prompt: 'For "longest subarray with sum k", the map stores one index per prefix value. Which one, and why?',
    options: [
      'The latest index — newer information is better',
      'The earliest index — pairing the current end with the earliest matching start gives the longest subarray',
      'Any index — all give the same length',
      'The index with the largest value',
    ],
    answer: 1,
    explain: 'For a fixed right end, the length is (r + 1) − l, maximised by the smallest l. Overwriting with later indices would make every candidate shorter. (For the *shortest* subarray you would store the latest.)',
  },
  {
    id: 'arr-q-ph-mod', topic: T, page: 'prefix-hashing', kind: 'numeric', difficulty: 'hard',
    title: 'Divisible by 5',
    prompt: 'How many subarrays of `[4, 5, 0, −2, −3, 1]` have a sum divisible by **5**?',
    answer: 7,
    explain: 'Prefix remainders mod 5 (non-negative): 0, 4, 4, 4, 2, 4, 0. Remainder 0 appears 2 times → 1 pair; remainder 4 appears 4 times → 6 pairs; remainder 2 once → 0. Total 7.',
  },
  {
    id: 'arr-q-ph-xor', topic: T, page: 'prefix-hashing', kind: 'numeric', difficulty: 'medium',
    title: 'Range XOR from prefixes',
    prompt: 'For `a = [5, 3, 6, 1, 7]`, the prefix XORs are X = [0, 5, 6, 0, 1, 6]. What is a[1] ⊕ a[2] ⊕ a[3]?',
    answer: 4,
    explain: 'xor(1..3) = X[4] ⊕ X[1] = 1 ⊕ 5 = 4. Check directly: 3 ⊕ 6 = 5, 5 ⊕ 1 = 4.',
  },
  {
    id: 'arr-q-ph-product', topic: T, page: 'prefix-hashing', kind: 'array', difficulty: 'easy',
    title: 'Product except self with a zero',
    prompt: 'What is "product of array except self" for `[1, 2, 0, 4]`?',
    answer: [0, 0, 8, 0],
    explain: 'Every product that includes the 0 is 0. Only index 2 excludes it: 1 × 2 × 4 = 8. Division by the total would have divided by zero here.',
  },
  {
    id: 'arr-q-ph-match', topic: T, page: 'prefix-hashing', kind: 'match', difficulty: 'medium',
    title: 'Which prefix quantity?',
    prompt: 'Match each problem with what the hash map should be keyed by.',
    left: [
      'Count subarrays with sum divisible by m',
      'Longest subarray with equally many 0s and 1s',
      'Count subarrays with XOR equal to k',
      'Count subarrays containing exactly k odd numbers',
    ],
    right: ['Prefix sum mod m', 'Prefix sum after mapping 0 → −1', 'Prefix XOR', 'Number of odd values so far'],
    explain: 'Each turns the subarray condition into an equality between two prefixes: equal remainders, a zero balance, X[r+1] ⊕ X[l] = k, and odds(r) − odds(l) = k.',
  },
  {
    id: 'arr-q-ph-fill', topic: T, page: 'prefix-hashing', kind: 'fill', difficulty: 'medium',
    title: 'Complete the counter',
    prompt: 'Complete "count subarrays with sum k".',
    code: `
seen = {0: 1}
P = count = 0
for x in a:
    P += x
    count += seen.get([[0]], 0)
    seen[P] = [[1]]`,
    blanks: [['P - k', 'P-k'], ['seen.get(P, 0) + 1', 'seen.get(P,0)+1', '1 + seen.get(P, 0)']],
    hint: 'Which earlier prefix value makes the subarray ending here sum to k?',
    explain: 'sum(l..r) = P − P[l] = k ⇔ P[l] = P − k. Look that up first, then record the current prefix by incrementing its count.',
  },

  // ── Difference arrays and 2D prefix sums
  {
    id: 'arr-q-r2-telescope', topic: T, page: 'range-2d', kind: 'mcq', difficulty: 'medium',
    title: 'Why the prefix of D restores a',
    prompt: 'With D[0] = a[0] and D[i] = a[i] − a[i−1], why does D[0] + D[1] + … + D[i] equal a[i]?',
    options: [
      'Because D is sorted',
      'Because the sum telescopes: every a[j] for j < i appears once with + and once with −',
      'Because D[i] = a[i] for all i',
      'It only holds when a is non-negative',
    ],
    answer: 1,
    explain: 'a[0] + (a[1] − a[0]) + (a[2] − a[1]) + … + (a[i] − a[i−1]): all intermediate terms cancel, leaving a[i]. That is why a range update only needs to change the two differences at its edges.',
  },
  {
    id: 'arr-q-r2-diff-trace', topic: T, page: 'range-2d', kind: 'array', difficulty: 'medium',
    title: 'Apply three range additions',
    prompt: 'Start with six zeros. Apply "add 2 to [1, 3]", "add 1 to [2, 5]", "add 3 to [0, 1]" (inclusive indices) using a difference array. What is the final array?',
    answer: [3, 5, 3, 3, 1, 1],
    explain: 'Mark D[1] += 2, D[4] −= 2, D[2] += 1, D[6] −= 1, D[0] += 3, D[2] −= 3, then take running sums. Per index: 0 gets 3; 1 gets 3 + 2 = 5; 2 gets 2 + 1 = 3; 3 gets 2 + 1 = 3; 4 and 5 get 1.',
  },
  {
    id: 'arr-q-r2-build', topic: T, page: 'range-2d', kind: 'numeric', difficulty: 'easy',
    title: 'One inclusion–exclusion step',
    prompt: 'Building P for M = `[[1, 2], [4, 5]]` you already have P[1][2] = 3, P[2][1] = 5, P[1][1] = 1. What is P[2][2]?',
    answer: 12,
    explain: 'P[2][2] = M[1][1] + P[1][2] + P[2][1] − P[1][1] = 5 + 3 + 5 − 1 = 12, which is indeed 1 + 2 + 4 + 5.',
  },
  {
    id: 'arr-q-r2-query', topic: T, page: 'range-2d', kind: 'numeric', difficulty: 'medium',
    title: 'Rectangle sum',
    prompt: 'M = `[[1, 2, 3], [4, 5, 6], [7, 8, 9]]`. What is the sum of rows 1…2, columns 1…2 (0-based, inclusive)? Compute it with P[3][3] − P[1][3] − P[3][1] + P[1][1].',
    answer: 28,
    explain: 'P[3][3] = 45, P[1][3] = 6 (row 0), P[3][1] = 12 (column 0), P[1][1] = 1. 45 − 6 − 12 + 1 = 28 = 5 + 6 + 8 + 9.',
  },
  {
    id: 'arr-q-r2-corners', topic: T, page: 'range-2d', kind: 'mcq', difficulty: 'medium',
    title: 'Four corner marks',
    prompt: 'To add v to rows 1…2 and columns 1…3 with a 2D difference array D, which four marks are written?',
    options: [
      '+v at (1,1), −v at (1,4), −v at (3,1), +v at (3,4)',
      '+v at (1,1), +v at (1,3), +v at (2,1), +v at (2,3)',
      '+v at (1,1), −v at (2,3)',
      '+v at (1,1), −v at (1,3), −v at (2,1), +v at (2,3)',
    ],
    answer: 0,
    explain: 'The marks go at the top-left corner and one step past the right and bottom edges: (r1, c1), (r1, c2+1), (r2+1, c1), (r2+1, c2+1) = (1,1), (1,4), (3,1), (3,4), with signs +, −, −, +.',
  },
  {
    id: 'arr-q-r2-overlap', topic: T, page: 'range-2d', kind: 'numeric', difficulty: 'medium',
    title: 'Maximum overlap',
    prompt: 'Intervals (inclusive): [1, 4], [2, 5], [7, 9], [3, 8]. What is the largest number of intervals covering a single point?',
    answer: 3,
    explain: 'Points 3 and 4 are covered by [1,4], [2,5] and [3,8]. Around 7–8 only [3,8] and [7,9] overlap. The running sum of +1/−1 marks peaks at 3.',
  },
  {
    id: 'arr-q-r2-online', topic: T, page: 'range-2d', kind: 'mcq', difficulty: 'medium',
    title: 'When the difference array is not enough',
    prompt: 'Range additions and point queries **interleave**: after each update the program must answer "what is a[i] now?". Which is the right tool?',
    options: [
      'A difference array, rebuilt with a prefix pass after each update: O(n) per query',
      'A Fenwick tree (or segment tree) over the difference array: O(log n) per update and per query',
      'Plain prefix sums',
      'Sorting the updates',
    ],
    answer: 1,
    explain: 'A difference array only shines offline (all updates, then reads). Online, store D in a Fenwick tree: an update is two point-adds, a point query is a prefix sum — both O(log n).',
  },
  {
    id: 'arr-q-r2-order', topic: T, page: 'range-2d', kind: 'order', difficulty: 'easy',
    title: 'The 2D range-update recipe',
    prompt: 'Put the steps of "apply m rectangle additions, then print the grid" in order.',
    items: [
      'Allocate D with (R + 1) × (C + 1) zeros',
      'For each update, write +v, −v, −v, +v at its four corners',
      'Run a 2D prefix sum over D',
      'Read each cell’s final value',
    ],
    explain: 'All updates are recorded as O(1) corner marks first; a single O(R·C) prefix pass converts the marks into values.',
  },
]
