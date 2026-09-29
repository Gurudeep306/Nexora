import type { Question } from '../../../questions/types'

const T = 'arrays'

/* Conceptual, tracing and prediction questions — graded on the page. */
const concept: Question[] = [
  // ── What an array is
  {
    id: 'arr-q-address', topic: T, page: 'what-is-an-array', kind: 'numeric', difficulty: 'easy',
    title: 'Where does arr[5] live?',
    prompt: 'An `int` array (4 bytes per element) starts at address **1000**. At which address does `arr[5]` begin? (Answer in decimal.)',
    answer: 1020,
    explain: 'address = base + i × size = 1000 + 5 × 4 = 1020.',
  },
  {
    id: 'arr-q-zero-index', topic: T, page: 'what-is-an-array', kind: 'mcq', difficulty: 'easy',
    title: 'Why 0-based?',
    prompt: 'Why do most languages number array elements from 0?',
    options: [
      'Because the index is an offset from the start: element i is at base + i × size, so the first element needs no offset',
      'Because 0 is faster to store than 1',
      'Because arrays always contain a hidden element at index 0',
      'It is an arbitrary convention with no technical reason',
    ],
    answer: 0,
    explain: 'The index says how many elements to skip. With 0-based indexing the address formula is base + i × size, with no extra subtraction.',
  },
  {
    id: 'arr-q-access-cost', topic: T, page: 'what-is-an-array', kind: 'mcq', difficulty: 'easy',
    title: 'Cost of arr[i]',
    prompt: 'An array holds 10 million elements. Compared with reading `arr[3]`, reading `arr[9999999]` is…',
    options: ['About 3 million times slower', 'O(log n) slower', 'The same cost — O(1)', 'Impossible without a loop'],
    answer: 2,
    explain: 'Both are one multiplication and one addition to compute the address. Random access does not depend on the index or on n.',
  },
  {
    id: 'arr-q-oob-lang', topic: T, page: 'what-is-an-array', kind: 'multi', difficulty: 'medium',
    title: 'Reading past the end',
    prompt: 'In which languages does reading `a[n]` (one past the end of a plain array) raise an error at run time? Select all that apply.',
    options: ['Java', 'Python', 'C', 'JavaScript', 'C++ with operator[]'],
    answers: [0, 1],
    explain: 'Java throws ArrayIndexOutOfBoundsException and Python IndexError. JavaScript returns undefined silently; C and C++ (operator[]) perform no check — undefined behaviour. C++ `.at()` does check.',
  },
  {
    id: 'arr-q-last-index', topic: T, page: 'what-is-an-array', kind: 'numeric', difficulty: 'easy',
    title: 'The last valid index',
    prompt: 'An array has 64 elements. What is the largest valid index?',
    answer: 63,
    explain: 'Indexes run from 0 to n − 1 = 63. Index 64 is one past the end.',
  },

  // ── Traversal
  {
    id: 'arr-q-max-init', topic: T, page: 'traversal', kind: 'mcq', difficulty: 'easy',
    title: 'Initialising the maximum',
    prompt: 'This code finds the maximum: `best = 0; for x in a: if x > best: best = x`. For which input does it give a **wrong** answer?',
    options: ['[3, 9, 2]', '[0, 0, 0]', '[-4, -2, -7]', '[5]'],
    answer: 2,
    explain: 'All values are negative, so nothing beats the initial 0 and the code reports 0 — a value not in the array. Initialise with a[0] (or −∞).',
  },
  {
    id: 'arr-q-loop-count', topic: T, page: 'traversal', kind: 'numeric', difficulty: 'easy',
    title: 'How many iterations?',
    prompt: 'How many times does the body run in `for (int i = 2; i <= 10; i++)`?',
    answer: 9,
    explain: 'Inclusive range 2…10 has 10 − 2 + 1 = 9 values. With a half-open range (i < 10) it would be 8.',
  },
  {
    id: 'arr-q-trace-sum', topic: T, page: 'traversal', kind: 'numeric', difficulty: 'easy',
    title: 'Trace the loop',
    prompt: 'What does this print for `a = [4, 7, 1, 8, 3]`?\n\n```python\ns = 0\nfor i in range(1, len(a), 2):\n    s += a[i]\nprint(s)\n```',
    answer: 15,
    explain: 'range(1, 5, 2) gives i = 1, 3 → a[1] + a[3] = 7 + 8 = 15.',
  },
  {
    id: 'arr-q-overflow', topic: T, page: 'traversal', kind: 'mcq', difficulty: 'medium',
    title: 'Choosing the sum type',
    prompt: 'You sum up to 200,000 values, each up to 10⁹, in C++. Which type should hold the sum?',
    options: ['int', 'long long', 'short', 'float'],
    answer: 1,
    explain: 'The sum can reach 2 × 10¹⁴; int overflows past about 2.1 × 10⁹. A 64-bit long long holds up to about 9.2 × 10¹⁸. float would lose precision.',
  },
  {
    id: 'arr-q-second', topic: T, page: 'traversal', kind: 'numeric', difficulty: 'medium',
    title: 'Second largest distinct',
    prompt: 'What is the second largest **distinct** value of `[5, 9, 9, 3, 7, 9]`?',
    answer: 7,
    explain: 'The distinct values are 3, 5, 7, 9. The largest is 9; the second largest distinct is 7 (the repeated 9s do not count twice).',
  },

  // ── Insert / delete
  {
    id: 'arr-q-insert-moves', topic: T, page: 'insert-delete', kind: 'numeric', difficulty: 'easy',
    title: 'Counting shifts',
    prompt: 'An array holds 10 elements (with spare capacity). How many elements must move to insert a new value at index 3?',
    answer: 7,
    explain: 'Indexes 3…9 each move one slot right: 10 − 3 = 7 moves.',
  },
  {
    id: 'arr-q-insert-order', topic: T, page: 'insert-delete', kind: 'mcq', difficulty: 'medium',
    title: 'Which direction to shift?',
    prompt: 'To insert at index k, you shift elements right. Why must the loop run from the **end** towards k, not from k towards the end?',
    options: [
      'It is faster from the end',
      'Going from k upwards overwrites a[k+1] before it is copied, so one value gets copied into every slot',
      'Arrays can only be written from right to left',
      'There is no difference',
    ],
    answer: 1,
    explain: 'a[k+1] = a[k] destroys the old a[k+1]; the next step copies the same value again. Copying right-to-left moves each value before its slot is overwritten.',
  },
  {
    id: 'arr-q-trace-insert', topic: T, page: 'insert-delete', kind: 'array', difficulty: 'easy',
    title: 'Predict the array after insert',
    prompt: 'Start with `[3, 8, 14, 20]`. Insert **11** at index **2**. What is the array?',
    answer: [3, 8, 11, 14, 20],
    explain: '14 and 20 shift right, 11 goes into index 2.',
  },
  {
    id: 'arr-q-trace-delete', topic: T, page: 'insert-delete', kind: 'array', difficulty: 'easy',
    title: 'Predict the array after delete',
    prompt: 'Start with `[5, 10, 15, 20, 25]`. Delete the element at index **1**, then delete the element at index **2** of the result. What is left?',
    answer: [5, 15, 25],
    explain: 'After the first delete: [5, 15, 20, 25]. Index 2 is now 20; deleting it gives [5, 15, 25].',
  },
  {
    id: 'arr-q-pop0', topic: T, page: 'insert-delete', kind: 'mcq', difficulty: 'medium',
    title: 'A hidden quadratic',
    prompt: 'A Python loop runs `while lst: x = lst.pop(0); process(x)` on a list of n items. What is the total time?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'],
    answer: 2,
    explain: 'pop(0) removes the front, shifting the other n − 1 items: O(n) each, O(n²) in total. Use collections.deque.popleft() (O(1)) or iterate instead.',
  },

  // ── Searching
  {
    id: 'arr-q-linear-worst', topic: T, page: 'searching', kind: 'numeric', difficulty: 'easy',
    title: 'Worst case comparisons',
    prompt: 'Linear search on an array of 1000 elements. How many comparisons in the worst case?',
    answer: 1000,
    explain: 'Target absent (or last): every element is compared once.',
  },
  {
    id: 'arr-q-linear-avg', topic: T, page: 'searching', kind: 'numeric', difficulty: 'medium',
    title: 'Average comparisons',
    prompt: 'The target is in an array of 9 distinct elements, equally likely at any position. What is the average number of comparisons for linear search?',
    answer: 5,
    explain: 'Position k (1-based) costs k comparisons; the average of 1…9 is (9 + 1) / 2 = 5.',
  },
  {
    id: 'arr-q-search-many', topic: T, page: 'searching', kind: 'mcq', difficulty: 'medium',
    title: 'Many searches',
    prompt: 'You must answer 100,000 "is x present?" questions on the same array of 100,000 numbers. Which plan is fastest overall?',
    options: [
      'Linear search for every question',
      'Sort once, then binary search each question',
      'Reverse the array before every question',
      'Linear search from both ends at once',
    ],
    answer: 1,
    explain: 'Linear: 10⁵ × 10⁵ = 10¹⁰ steps. Sorting once (≈ 1.7 × 10⁶) plus 10⁵ binary searches (≈ 1.7 × 10⁶) is thousands of times faster. A hash set would also work.',
  },
  {
    id: 'arr-q-first-last', topic: T, page: 'searching', kind: 'text', difficulty: 'easy',
    title: 'First and last',
    prompt: 'For `[4, 2, 7, 2, 9, 2]`, give the first and last index of **2**, separated by a space (e.g. `0 3`).',
    accept: ['1 5', '1,5', '1, 5'],
    explain: '2 appears at indexes 1, 3 and 5: first 1, last 5.',
  },

  // ── Reverse / rotate
  {
    id: 'arr-q-reverse-swaps', topic: T, page: 'reverse-rotate', kind: 'numeric', difficulty: 'easy',
    title: 'Swaps to reverse',
    prompt: 'How many swaps does the two-pointer reversal make on an array of **11** elements?',
    answer: 5,
    explain: '⌊11 / 2⌋ = 5 swaps; the middle element (index 5) stays where it is.',
  },
  {
    id: 'arr-q-trace-rotate', topic: T, page: 'reverse-rotate', kind: 'array', difficulty: 'easy',
    title: 'Rotate right',
    prompt: 'Rotate `[1, 2, 3, 4, 5, 6]` **right** by **2**.',
    answer: [5, 6, 1, 2, 3, 4],
    explain: 'The last two elements (5, 6) wrap around to the front.',
  },
  {
    id: 'arr-q-rotate-mod', topic: T, page: 'reverse-rotate', kind: 'array', difficulty: 'medium',
    title: 'A big k',
    prompt: 'Rotate `[10, 20, 30, 40, 50]` right by **12**.',
    answer: [40, 50, 10, 20, 30],
    explain: '12 mod 5 = 2, so this is a rotation by 2: [40, 50, 10, 20, 30].',
  },
  {
    id: 'arr-q-rotate-steps', topic: T, page: 'reverse-rotate', kind: 'order', difficulty: 'medium',
    title: 'Order the rotation steps',
    prompt: 'Put the steps of the in-place right rotation by k in order.',
    items: ['k ← k mod n', 'Reverse the whole array', 'Reverse the first k elements', 'Reverse the remaining n − k elements'],
    explain: 'Reduce k, reverse everything (B^R A^R), then reverse each block back (B A).',
  },
  {
    id: 'arr-q-rotate-left', topic: T, page: 'reverse-rotate', kind: 'numeric', difficulty: 'medium',
    title: 'Left as right',
    prompt: 'Rotating an array of length 9 **left** by 4 is the same as rotating it **right** by how many positions?',
    answer: 5,
    explain: 'Left by k = right by n − k = 9 − 4 = 5.',
  },

  // ── Dynamic arrays
  {
    id: 'arr-q-amortized', topic: T, page: 'dynamic-arrays', kind: 'mcq', difficulty: 'medium',
    title: 'What amortized means',
    prompt: '“push_back is amortized O(1)” means…',
    options: [
      'Every single push_back takes constant time',
      'Over any sequence of n pushes the total is O(n), so the average per push is O(1), even though a single push can take O(n)',
      'push_back is O(1) only on average over random inputs',
      'push_back never copies elements',
    ],
    answer: 1,
    explain: 'Amortized is a worst-case guarantee on the total of a sequence, not a statement about random inputs. Individual resizes are expensive but rare.',
  },
  {
    id: 'arr-q-copies', topic: T, page: 'dynamic-arrays', kind: 'numeric', difficulty: 'medium',
    title: 'Counting copies',
    prompt: 'A dynamic array starts with capacity 1 and doubles when full. How many element **copies** happen in total while pushing 9 elements?',
    answer: 15,
    explain: 'Resizes happen when pushing the 2nd, 3rd, 5th and 9th elements, copying 1 + 2 + 4 + 8 = 15 elements.',
  },
  {
    id: 'arr-q-growth-add', topic: T, page: 'dynamic-arrays', kind: 'mcq', difficulty: 'medium',
    title: 'Growing by a constant',
    prompt: 'If a dynamic array grows its capacity by **+10** each time it is full (instead of doubling), the total cost of n appends is…',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(10n)'],
    answer: 2,
    explain: 'Copies of 10, 20, 30, … up to n add up to about n²/20 — quadratic. Multiplying the capacity is what keeps the total linear.',
  },
  {
    id: 'arr-q-capacity-after', topic: T, page: 'dynamic-arrays', kind: 'numeric', difficulty: 'easy',
    title: 'Capacity after pushes',
    prompt: 'Starting from capacity 1 and doubling when full, what is the capacity after pushing 20 elements?',
    answer: 32,
    explain: 'Capacities go 1, 2, 4, 8, 16, 32. 16 is not enough for 20 elements, so it is 32.',
  },
  {
    id: 'arr-q-invalidate', topic: T, page: 'dynamic-arrays', kind: 'mcq', difficulty: 'hard',
    title: 'The dangling reference',
    prompt: 'In C++: `int &first = v[0]; v.push_back(7); cout << first;` — what can happen?',
    options: [
      'Always prints v[0]',
      'If push_back reallocates, first refers to freed memory: undefined behaviour',
      'Compile error',
      'push_back never reallocates when a reference exists',
    ],
    answer: 1,
    explain: 'A reallocation moves the elements to a new buffer; references, pointers and iterators into the old buffer dangle.',
  },

  // ── Prefix sums
  {
    id: 'arr-q-prefix-formula', topic: T, page: 'prefix-sums', kind: 'mcq', difficulty: 'easy',
    title: 'The range-sum formula',
    prompt: 'With P[0] = 0 and P[i + 1] = P[i] + a[i], the sum of a[l..r] (inclusive) is…',
    options: ['P[r] − P[l]', 'P[r + 1] − P[l]', 'P[r] − P[l − 1]', 'P[r + 1] − P[l + 1]'],
    answer: 1,
    explain: 'P[r + 1] is the sum of the first r + 1 elements (indexes 0…r); subtracting P[l] removes indexes 0…l − 1.',
  },
  {
    id: 'arr-q-prefix-build', topic: T, page: 'prefix-sums', kind: 'array', difficulty: 'easy',
    title: 'Build the prefix array',
    prompt: 'Write the prefix array P (with P[0] = 0) for `a = [2, 5, 1, 4]`.',
    answer: [0, 2, 7, 8, 12],
    explain: '0, 0+2, 2+5, 7+1, 8+4.',
  },
  {
    id: 'arr-q-prefix-query', topic: T, page: 'prefix-sums', kind: 'numeric', difficulty: 'easy',
    title: 'Answer a query',
    prompt: 'P = `[0, 3, 4, 8, 9, 14, 23]`. What is the sum of a[2..4]?',
    answer: 10,
    explain: 'P[5] − P[2] = 14 − 4 = 10.',
  },
  {
    id: 'arr-q-prefix-queries-cost', topic: T, page: 'prefix-sums', kind: 'mcq', difficulty: 'medium',
    title: 'Total cost',
    prompt: 'n = 10⁵ values and q = 10⁵ range-sum queries. Total work with prefix sums?',
    options: ['O(n·q) ≈ 10¹⁰', 'O(n + q) ≈ 2 × 10⁵', 'O(q log n)', 'O(n²)'],
    answer: 1,
    explain: 'O(n) to build plus O(1) per query.',
  },
  {
    id: 'arr-q-diff', topic: T, page: 'prefix-sums', kind: 'array', difficulty: 'medium',
    title: 'Difference array in action',
    prompt: 'An array of 6 zeros receives two updates: add 3 to indexes 1…3, then add 2 to indexes 2…5. What is the final array?',
    answer: [0, 3, 5, 5, 2, 2],
    explain: 'D after the updates: [0, 3, 2, 0, −3, 0, −2]; its running sum gives [0, 3, 5, 5, 2, 2].',
  },

  // ── Two pointers
  {
    id: 'arr-q-2p-why', topic: T, page: 'two-pointers', kind: 'mcq', difficulty: 'medium',
    title: 'Why lo++ is safe',
    prompt: 'In pair-sum on a sorted array, a[lo] + a[hi] < T. Why may we discard a[lo]?',
    options: [
      'Because a[lo] is the smallest value',
      'Because a[lo] paired with the largest remaining value is still too small, so it is too small with every other remaining value',
      'Because the array is reversed',
      'Because hi will always move next',
    ],
    answer: 1,
    explain: 'Every other remaining partner is ≤ a[hi], so every pair using a[lo] sums to less than T.',
  },
  {
    id: 'arr-q-2p-trace', topic: T, page: 'two-pointers', kind: 'text', difficulty: 'medium',
    title: 'Which pair is found?',
    prompt: 'Run pair-sum on `[1, 2, 4, 7, 11, 15]` with T = 15. Which **indices** (lo hi) are reported? Answer like `1 4`.',
    accept: ['2 4', '2,4', '2, 4'],
    explain: '1+15=16>15 → hi=4; 1+11=12<15 → lo=1; 2+11=13<15 → lo=2; 4+11=15 ✓ → indices 2 and 4.',
  },
  {
    id: 'arr-q-dedupe-result', topic: T, page: 'two-pointers', kind: 'numeric', difficulty: 'easy',
    title: 'How many unique?',
    prompt: 'What length does in-place dedupe return for `[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]`?',
    answer: 5,
    explain: 'Unique values 0, 1, 2, 3, 4.',
  },
  {
    id: 'arr-q-2p-order', topic: T, page: 'two-pointers', kind: 'array', difficulty: 'easy',
    title: 'Move the zeroes',
    prompt: 'Apply the stable move-zeroes algorithm to `[0, 1, 0, 3, 12]`.',
    answer: [1, 3, 12, 0, 0],
    explain: 'Non-zeros keep their order (1, 3, 12); zeroes go to the end.',
  },
  {
    id: 'arr-q-2p-sorted-needed', topic: T, page: 'two-pointers', kind: 'mcq', difficulty: 'medium',
    title: 'Unsorted input',
    prompt: 'The array is **not** sorted and you need a pair with sum T in O(n) time. What do you use?',
    options: ['Opposite-end two pointers as is', 'A hash set of values seen so far', 'Kadane’s algorithm', 'A sliding window'],
    answer: 1,
    explain: 'The two-pointer argument needs sorted order. Without sorting, check T − x in a hash set as you scan (O(n) average), or sort first (O(n log n)).',
  },

  // ── Sliding window
  {
    id: 'arr-q-window-update', topic: T, page: 'sliding-window', kind: 'mcq', difficulty: 'easy',
    title: 'Sliding the sum',
    prompt: 'The window a[i−k..i−1] has sum s. After sliding one step right, the new sum is…',
    options: ['s + a[i]', 's + a[i] − a[i − k]', 's − a[i] + a[i − k]', 's + a[i] − a[i − 1]'],
    answer: 1,
    explain: 'a[i] enters and a[i − k] leaves.',
  },
  {
    id: 'arr-q-window-trace', topic: T, page: 'sliding-window', kind: 'numeric', difficulty: 'easy',
    title: 'Best window of 3',
    prompt: 'Maximum sum of 3 consecutive elements in `[4, 2, 1, 7, 8, 1, 2, 8, 1, 0]`?',
    answer: 16,
    explain: 'Windows: 7, 10, 16, 16, 11, 11, 11, 9 → maximum 16 (1+7+8 or 7+8+1).',
  },
  {
    id: 'arr-q-window-on', topic: T, page: 'sliding-window', kind: 'mcq', difficulty: 'medium',
    title: 'Why O(n)?',
    prompt: 'The variable window has a `while` loop inside a `for` loop. Why is it still O(n)?',
    options: [
      'The while loop runs at most once',
      'Both lo and hi only move forward, each at most n times, so the total work is at most 2n',
      'Because the array is sorted',
      'It is actually O(n²)',
    ],
    answer: 1,
    explain: 'Count pointer moves rather than loop nesting: each index enters once and leaves once.',
  },
  {
    id: 'arr-q-window-negative', topic: T, page: 'sliding-window', kind: 'mcq', difficulty: 'hard',
    title: 'Negative numbers',
    prompt: 'Why can the shrink-from-the-left window fail for "shortest subarray with sum ≥ S" when the array has negative numbers?',
    options: [
      'Because negative numbers cannot be added',
      'Because removing an element no longer always decreases the sum, so the condition is not monotonic and valid windows can be skipped',
      'Because the window becomes too large',
      'It does not fail',
    ],
    answer: 1,
    explain: 'With negatives, dropping a negative element from the left increases the sum, breaking the reasoning that lets the window only move forward.',
  },
  {
    id: 'arr-q-window-count', topic: T, page: 'sliding-window', kind: 'numeric', difficulty: 'easy',
    title: 'How many windows?',
    prompt: 'How many windows of size k = 4 are there in an array of n = 10 elements?',
    answer: 7,
    explain: 'n − k + 1 = 7 starting positions (0…6).',
  },

  // ── Kadane
  {
    id: 'arr-q-kadane-meaning', topic: T, page: 'kadane', kind: 'mcq', difficulty: 'medium',
    title: 'What cur means',
    prompt: 'In Kadane’s algorithm, after processing index i, `cur` equals…',
    options: [
      'The sum of all elements so far',
      'The best sum of a subarray that ends exactly at i',
      'The best sum found anywhere so far',
      'The maximum element so far',
    ],
    answer: 1,
    explain: 'cur is the best sum ending at i; best tracks the maximum of cur over all i.',
  },
  {
    id: 'arr-q-kadane-trace', topic: T, page: 'kadane', kind: 'numeric', difficulty: 'medium',
    title: 'Run Kadane',
    prompt: 'Maximum subarray sum of `[3, -4, 5, -1, 2, -6, 4]`?',
    answer: 6,
    explain: 'The subarray [5, −1, 2] sums to 6; nothing beats it.',
  },
  {
    id: 'arr-q-kadane-neg', topic: T, page: 'kadane', kind: 'numeric', difficulty: 'easy',
    title: 'All negative',
    prompt: 'Maximum (non-empty) subarray sum of `[-8, -3, -6, -2, -5]`?',
    answer: -2,
    explain: 'Every subarray is negative; the best is the single largest element, −2.',
  },
  {
    id: 'arr-q-kadane-restart', topic: T, page: 'kadane', kind: 'mcq', difficulty: 'medium',
    title: 'When to restart',
    prompt: 'Kadane starts a fresh subarray at a[i] exactly when…',
    options: ['a[i] is negative', 'cur (ending at i − 1) is negative', 'best is negative', 'i is even'],
    answer: 1,
    explain: 'max(a[i], cur + a[i]) picks a[i] alone precisely when cur < 0.',
  },

  // ── 2D arrays
  {
    id: 'arr-q-rowmajor', topic: T, page: '2d-arrays', kind: 'numeric', difficulty: 'easy',
    title: 'Row-major offset',
    prompt: 'A 5 × 8 matrix is stored row-major. At which offset is M[3][6]?',
    answer: 30,
    explain: 'r × C + c = 3 × 8 + 6 = 30.',
  },
  {
    id: 'arr-q-rowmajor-col', topic: T, page: '2d-arrays', kind: 'numeric', difficulty: 'medium',
    title: 'Column-major offset',
    prompt: 'The same 5 × 8 matrix stored **column-major** (like Fortran/MATLAB). Offset of M[3][6]?',
    answer: 33,
    explain: 'c × R + r = 6 × 5 + 3 = 33.',
  },
  {
    id: 'arr-q-python-rows', topic: T, page: '2d-arrays', kind: 'mcq', difficulty: 'medium',
    title: 'Python grid bug',
    prompt: '`g = [[0] * 3] * 2; g[0][1] = 5; print(g)` prints…',
    options: ['[[0, 5, 0], [0, 0, 0]]', '[[0, 5, 0], [0, 5, 0]]', '[[5, 5, 5], [0, 0, 0]]', 'An error'],
    answer: 1,
    explain: 'Both rows are the same list object, so the write shows up in both.',
  },
  {
    id: 'arr-q-transpose-shape', topic: T, page: '2d-arrays', kind: 'text', difficulty: 'easy',
    title: 'Shape of a transpose',
    prompt: 'A matrix has 3 rows and 7 columns. What is the shape of its transpose? Answer as `rows x cols`.',
    accept: ['7 x 3', '7x3', '7 × 3', '7×3'],
    explain: 'Rows become columns: 7 × 3.',
  },

  // ── Added: fill-the-code, matching, new techniques
  {
    id: 'arr-q-fill-max', topic: T, page: 'traversal', kind: 'fill', difficulty: 'easy',
    title: 'Complete the maximum',
    prompt: 'Fill in the blanks so the function returns the largest value — it must work even when every value is negative.',
    code: `
best = [[0]]
for i in range(1, len(a)):
    if a[i] [[1]] best:
        best = a[i]
return best`,
    blanks: [['a[0]'], ['>', '>=']],
    hint: 'Start from a value that is certainly in the array.',
    explain: 'Start with `a[0]` (never 0 or a made-up value), then replace `best` whenever `a[i] > best`. `>=` also works — it only changes *which* copy of an equal maximum you remember.',
  },
  {
    id: 'arr-q-leaders-trace', topic: T, page: 'traversal', kind: 'array', difficulty: 'medium',
    title: 'Find the leaders',
    prompt: 'List the leaders of `[7, 10, 4, 10, 6, 5, 2]` from left to right. (A leader is **strictly** greater than everything to its right.)',
    answer: [10, 6, 5, 2],
    hint: 'Walk from the right with a running maximum.',
    explain: 'From the right: 2 (max −∞) → leader; 5 > 2 → leader; 6 > 5 → leader; 10 > 6 → leader; 4 < 10; 10 is **not** > 10; 7 < 10. Left to right: 10, 6, 5, 2 — the second 10.',
  },
  {
    id: 'arr-q-majority-trace', topic: T, page: 'traversal', kind: 'numeric', difficulty: 'medium',
    title: 'Trace the vote',
    prompt: 'Run Boyer–Moore voting on `[3, 3, 4, 2, 4, 4, 2, 4, 4]`. What is `count` at the end of the pass?',
    answer: 3,
    hint: 'count = 0 means the next value becomes the candidate.',
    explain: '3(c=1) 3(2) 4(1) 2(0) 4 adopted (1) 4(2) 2(1) 4(2) 4(3). Candidate 4, count 3. The count is not the number of 4s (there are 5) — it is the votes left after cancelling.',
  },
  {
    id: 'arr-q-majority-verify', topic: T, page: 'traversal', kind: 'mcq', difficulty: 'medium',
    title: 'Why the second pass?',
    prompt: 'After the voting pass on `[1, 2, 3]`, the candidate is…',
    options: ['1', '2', '3, even though it is not a majority', 'None — the pass detects that there is no majority'],
    answer: 2,
    explain: '1 is adopted, 2 cancels it, 3 is adopted with count 1. The survivor is 3 — but it appears once out of three. Voting only guarantees "if a majority exists, it is the survivor", so a second counting pass must confirm it.',
  },
  {
    id: 'arr-q-fill-insert', topic: T, page: 'insert-delete', kind: 'fill', difficulty: 'easy',
    title: 'Complete the insertion',
    prompt: 'Insert `x` at index `k` of an array holding `n` values (there is room for one more).',
    code: `
for (int j = n - 1; j >= k; j--)
    arr[[[0]]] = arr[j];
arr[k] = x;
n[[1]];`,
    blanks: [['j + 1'], ['++', '+= 1', '=n+1']],
    hint: 'Each value moves one slot to the right.',
    explain: '`arr[j + 1] = arr[j]` shifts each value right, from the end backwards so nothing is overwritten; finally the size grows: `n++`.',
  },
  {
    id: 'arr-q-match-ops', topic: T, page: 'insert-delete', kind: 'match', difficulty: 'easy',
    title: 'Match the cost',
    prompt: 'Match each array operation with its time cost.',
    left: ['Read `arr[i]`', 'Insert at the front', 'Append to a dynamic array', 'Find a value in an unsorted array', 'Find a value in a sorted array'],
    right: ['O(1)', 'O(n) — everything shifts', 'O(1) amortized', 'O(n) — may check everything', 'O(log n)'],
    explain: 'Indexing is address arithmetic; inserting at the front shifts all n values; appends are O(1) on average thanks to doubling; unsorted search is linear; sorted search can halve the range each step (binary search).',
  },
  {
    id: 'arr-q-fill-reverse', topic: T, page: 'reverse-rotate', kind: 'fill', difficulty: 'easy',
    title: 'Complete the reversal',
    prompt: 'Reverse the list in place with two pointers.',
    code: `
lo, hi = 0, len(a) - 1
while lo [[0]] hi:
    a[lo], a[hi] = a[hi], a[lo]
    lo += 1
    [[1]]`,
    blanks: [['<', '!='], ['hi -= 1', 'hi = hi - 1']],
    explain: 'Swap while `lo < hi`, moving both pointers inward. With `<=` the middle element would be swapped with itself (harmless); `!=` breaks for even lengths when the pointers cross — so `<` is the safe choice.',
  },
  {
    id: 'arr-q-diff-trace', topic: T, page: 'prefix-sums', kind: 'array', difficulty: 'medium',
    title: 'Build the difference array',
    prompt: 'n = 5 and D starts as six zeros. Apply "add 3 to [0, 2]" and then "add 2 to [1, 4]". What is D (all 6 entries)?',
    answer: [3, 2, 0, -3, 0, -2],
    hint: 'Each update touches D[l] and D[r + 1] only.',
    explain: 'First update: D[0] += 3, D[3] −= 3. Second: D[1] += 2, D[5] −= 2. So D = [3, 2, 0, −3, 0, −2]; its running sum [3, 5, 5, 2, 2] is what each index received.',
  },
  {
    id: 'arr-q-fill-prefix', topic: T, page: 'prefix-sums', kind: 'fill', difficulty: 'medium',
    title: 'Complete the prefix sums',
    prompt: 'Fill in the build step and the O(1) range query.',
    code: `
P[0] = 0;
for (int i = 0; i < n; i++)
    P[i + 1] = [[0]];
// sum of arr[l..r], inclusive
long long s = [[1]];`,
    blanks: [['P[i] + arr[i]', 'arr[i] + P[i]'], ['P[r + 1] - P[l]', '-P[l] + P[r + 1]']],
    explain: 'Each prefix extends the previous one by one element. The range l…r is "first r + 1 elements" minus "first l elements": `P[r + 1] − P[l]`.',
  },
  {
    id: 'arr-q-dutch-trace', topic: T, page: 'two-pointers', kind: 'array', difficulty: 'medium',
    title: 'One step of the flag',
    prompt: 'Run **one** iteration of the Dutch national flag loop on `[2, 0, 1, 2, 0]` (lo = mid = 0, hi = 4). What does the array look like?',
    answer: [0, 0, 1, 2, 2],
    explain: 'a[mid] = 2, so it is swapped with a[hi]: positions 0 and 4 trade places → [0, 0, 1, 2, 2], and hi becomes 3. mid stays at 0 because the 0 that arrived still has to be looked at.',
  },
  {
    id: 'arr-q-dutch-mid', topic: T, page: 'two-pointers', kind: 'mcq', difficulty: 'medium',
    title: 'Why mid stays put',
    prompt: 'In the Dutch flag algorithm, after swapping a 2 with `a[hi]`, why is `mid` **not** incremented?',
    options: [
      'The value swapped in from hi has never been examined — it could be 0, 1 or 2',
      'Incrementing mid would make the loop run forever',
      'mid must always equal lo',
      'It is only an optimisation; incrementing would also be correct',
    ],
    answer: 0,
    explain: 'Everything in (hi, n) is 2 and everything below mid is 0 or 1 — but a[hi] itself was in the unknown zone. After the swap it sits at mid, still unknown, so the next iteration must inspect it. After swapping with lo, by contrast, the value that comes back is a known 1 (or the same 0), so mid can advance.',
  },
  {
    id: 'arr-q-merge-cmp', topic: T, page: 'two-pointers', kind: 'numeric', difficulty: 'medium',
    title: 'Comparisons in a merge',
    prompt: 'How many comparisons `A[i] <= B[j]` does the merge make on A = `[1, 2, 3]` and B = `[4, 5, 6]`?',
    answer: 3,
    hint: 'Comparisons stop as soon as one array runs out.',
    explain: '1≤4, 2≤4, 3≤4 — then A is used up and B is copied without comparing. The worst case is n + m − 1 comparisons (for interleaved values), the best is min(n, m).',
  },
  {
    id: 'arr-q-fill-merge', topic: T, page: 'two-pointers', kind: 'fill', difficulty: 'medium',
    title: 'Complete the merge',
    prompt: 'Complete the merge of sorted A (size n) and B (size m) into C.',
    code: `
while (i < n && j < m) {
    if (A[i] [[0]] B[j]) C[k++] = A[i++];
    else                 C[k++] = [[1]];
}
while (i < n) C[k++] = [[2]];
while (j < m) C[k++] = B[j++];`,
    blanks: [['<=', '<'], ['B[j++]'], ['A[i++]']],
    hint: 'Take from A when its front is not larger.',
    explain: 'Take the smaller front, advancing that pointer. `<=` takes from A on ties, which keeps the merge **stable** (equal values keep their original order) — that is why merge sort uses it. `<` still merges correctly, but is not stable.',
  },
  {
    id: 'arr-q-match-technique', topic: T, page: 'sliding-window', kind: 'match', difficulty: 'medium',
    title: 'Pick the technique',
    prompt: 'Match each problem with the technique that solves it in linear time (or O(1) per query).',
    left: [
      'Many sum-of-range queries on an array that never changes',
      'Shortest subarray with sum ≥ S (all values positive)',
      'Two values with sum T in a **sorted** array',
      'Largest sum of a contiguous subarray (values may be negative)',
      'Many "add v to range [l, r]" updates, then print the array',
    ],
    right: ['Prefix sums', 'Sliding window', 'Two pointers from both ends', 'Kadane', 'Difference array'],
    explain: 'Static range sums → prefix sums. Positive values make the window monotone → sliding window. Sorted order lets one pointer at each end discard values → two pointers. Negative values break windows; Kadane keeps "best sum ending here". Batched range updates → difference array.',
  },
  {
    id: 'arr-q-fill-kadane', topic: T, page: 'kadane', kind: 'fill', difficulty: 'medium',
    title: 'Complete Kadane',
    prompt: 'Complete Kadane’s algorithm.',
    code: `
cur = best = a[0]
for x in a[1:]:
    cur = max(x, [[0]])
    best = [[1]]`,
    blanks: [['cur + x', 'x + cur'], ['max(best, cur)', 'max(cur, best)']],
    hint: 'cur is the best sum of a subarray that ends exactly at x.',
    explain: 'A subarray ending at x either starts fresh at x or extends the best one ending just before: `max(x, cur + x)`. The answer is the best of those over all positions.',
  },
  {
    id: 'arr-q-spiral-order', topic: T, page: '2d-arrays', kind: 'array', difficulty: 'easy',
    title: 'Spiral of a 3 × 3',
    prompt: 'The matrix is\n\n```\n1 2 3\n4 5 6\n7 8 9\n```\n\nWrite its clockwise spiral order.',
    answer: [1, 2, 3, 6, 9, 8, 7, 4, 5],
    explain: 'Top row 1 2 3, right column 6 9, bottom row backwards 8 7, left column upward 4, then the inner ring is just 5.',
  },
  {
    id: 'arr-q-spiral-guard', topic: T, page: '2d-arrays', kind: 'mcq', difficulty: 'hard',
    title: 'The missing guard',
    prompt: 'Remove the `if top <= bottom` check before the bottom row. What does the spiral print for the 1 × 3 matrix `[[1, 2, 3]]`?',
    options: ['1 2 3', '1 2 3 2 1', '1 2 3 3', 'It crashes'],
    answer: 1,
    explain: 'After the top row, top = 1 > bottom = 0 and right = 1. Without the guard the "bottom row" loop walks row 0 again from column 1 down to 0, printing 2 1 a second time: 1 2 3 2 1.',
  },
]

/* Coding problems — each opens the judge. */
const code = (id: string, page: string, title: string, difficulty: Question['difficulty'], prompt: string): Question => ({
  id, topic: T, page, kind: 'code', difficulty, title, prompt, explain: '', slug: id,
})

const coding: Question[] = [
  code('arr-c-sum', 'traversal', 'Sum of the array', 'easy', 'Read n numbers and print their sum. Values can be large — mind the type.'),
  code('arr-c-max-min', 'traversal', 'Maximum and minimum', 'easy', 'Print the largest and the smallest value in one pass.'),
  code('arr-c-second', 'traversal', 'Second largest distinct', 'medium', 'Print the second largest distinct value, or -1 if there is none.'),
  code('arr-c-insert', 'insert-delete', 'Insert at a position', 'easy', 'Insert x at position p and print the new array.'),
  code('arr-c-delete', 'insert-delete', 'Delete at a position', 'easy', 'Delete the element at position p and print the array.'),
  code('arr-c-linear-search', 'searching', 'First occurrence', 'easy', 'Print the index of the first occurrence of x, or -1.'),
  code('arr-c-count', 'searching', 'Answer occurrence queries', 'medium', 'For each query value, print how many times it occurs.'),
  code('arr-c-reverse', 'reverse-rotate', 'Reverse the array', 'easy', 'Print the array in reverse, reversing it in place.'),
  code('arr-c-rotate', 'reverse-rotate', 'Rotate right by k', 'medium', 'Rotate the array right by k (k can exceed n).'),
  code('arr-c-range-sum', 'prefix-sums', 'Range sum queries', 'medium', 'Answer q range-sum queries fast.'),
  code('arr-c-equilibrium', 'prefix-sums', 'Equilibrium index', 'medium', 'First index where the sum on the left equals the sum on the right.'),
  code('arr-c-range-add', 'prefix-sums', 'Many range additions', 'medium', 'Apply m range additions, then print the array.'),
  code('arr-c-pair-sum', 'two-pointers', 'Pair with sum in a sorted array', 'easy', 'Decide whether two different positions sum to T.'),
  code('arr-c-dedupe', 'two-pointers', 'Remove duplicates from a sorted array', 'easy', 'Print how many unique values, then the values.'),
  code('arr-c-move-zeroes', 'two-pointers', 'Move zeroes to the end', 'easy', 'Keep the order of the non-zero values.'),
  code('arr-c-window-max', 'sliding-window', 'Best window of size k', 'easy', 'Maximum sum of k consecutive elements.'),
  code('arr-c-min-len', 'sliding-window', 'Shortest subarray with sum ≥ S', 'medium', 'Positive values; print 0 if impossible.'),
  code('arr-c-longest-ones', 'sliding-window', 'Longest run of ones with k flips', 'medium', 'Flip at most k zeroes to ones; longest block of ones.'),
  code('arr-c-kadane', 'kadane', 'Maximum subarray sum', 'medium', 'The largest sum of a non-empty contiguous subarray.'),
  code('arr-c-transpose', '2d-arrays', 'Transpose a matrix', 'easy', 'Print the transpose of an R × C matrix.'),
  code('arr-c-spiral', '2d-arrays', 'Spiral order', 'medium', 'Print the matrix elements in clockwise spiral order.'),
  code('arr-c-rotate-matrix', '2d-arrays', 'Rotate a square matrix', 'medium', 'Rotate an N × N matrix 90° clockwise in place.'),
  code('arr-c-leaders', 'traversal', 'Leaders of an array', 'easy', 'Print every element greater than all elements to its right.'),
  code('arr-c-majority', 'traversal', 'Majority element', 'medium', 'Print the value that appears more than n/2 times, or -1 — in O(1) extra space.'),
  code('arr-c-dutch', 'two-pointers', 'Sort 0s, 1s and 2s', 'medium', 'Sort in one pass without counting.'),
  code('arr-c-merge', 'two-pointers', 'Merge two sorted arrays', 'easy', 'Merge A and B into one sorted array in O(n + m).'),
]

export const questions: Question[] = [...concept, ...coding]
