import type { Page } from '../../../types'

export const whatIsAnArray: Page = {
  id: 'what-is-an-array',
  title: 'What an array really is',
  summary: 'One block of memory, equal-sized slots, and the one-line formula that makes arr[i] instant.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        An **array** is a fixed number of values of the same type, stored **side by side in one continuous block of memory**. That single fact — *contiguous, equal-sized slots* — explains nearly everything about arrays: why reading \`arr[i]\` is instant, why inserting in the middle is slow, why arrays are so friendly to the CPU cache, and why their size is (usually) fixed.

        ## Picture the memory

        Memory is one long row of numbered bytes. When you ask for an array of 6 \`int\`s (4 bytes each), the system hands you 24 consecutive bytes. The first element starts at some address — call it the **base** — and every later element follows immediately after the previous one.

        | index | 0 | 1 | 2 | 3 | 4 | 5 |
        |---|---|---|---|---|---|---|
        | address | base | base+4 | base+8 | base+12 | base+16 | base+20 |

        So the address of element $i$ is always

        $$\\text{address}(i) = \\text{base} + i \\times \\text{size}$$

        This is the whole trick. To find \`arr[1000000]\` the computer does not walk past a million elements — it multiplies, adds, and jumps straight there. **Access by index is O(1)**: the same cost for the first element as for the millionth.
      `,
    },
    { t: 'viz', algo: 'arr-access', caption: 'Step through: the address is computed, not searched for. Try a different index or value and press Run.' },
    {
      t: 'md',
      md: `
        ## Why indexes start at 0

        Look at the formula again: element 0 sits exactly at \`base\`, with no offset. An index is really an **offset from the start** — "how many elements to skip". Starting at 1 would force every access to compute \`base + (i − 1) × size\`, one wasted subtraction on the hottest operation in computing. C made 0-based indexing standard and almost every language followed.

        A useful consequence: an array of length $n$ has valid indexes $0 \\ldots n-1$. The index $n$ is **one past the end** — a very common source of bugs.

        ## The four properties to remember

        1. **Contiguous** — elements are neighbours in memory. Reading them in order is extremely fast because the CPU loads memory in chunks (cache lines, usually 64 bytes = 16 ints at once).
        2. **Homogeneous** — every slot has the same size, which is what makes the address formula work. (Python lists and JS arrays store *references*, each the same size, pointing at the real objects.)
        3. **Fixed size** — the block was reserved at a certain length. Growing it means reserving a bigger block and copying (that is what *dynamic arrays* do — a later page).
        4. **Random access** — any index in O(1). This is the one thing linked lists cannot do.
      `,
    },
    {
      t: 'code',
      title: 'Creating, reading and writing an array',
      code: {
        cpp: `#include <vector>
#include <array>
using namespace std;

int a[5] = {4, 8, 15, 16, 23};     // C-style, fixed size, on the stack
array<int, 5> b = {4, 8, 15, 16, 23}; // fixed size, knows its length
vector<int> v = {4, 8, 15, 16, 23};   // dynamic (can grow)
vector<int> z(1000, 0);               // 1000 zeros

int x = v[2];        // read  -> 15   (no bounds check)
int y = v.at(2);     // read with bounds check (throws out_of_range)
v[2] = 42;           // write
int n = v.size();    // length`,
        java: `int[] a = {4, 8, 15, 16, 23};   // fixed size
int[] z = new int[1000];         // 1000 zeros (default value)
ArrayList<Integer> v = new ArrayList<>(List.of(4, 8, 15, 16, 23)); // dynamic

int x = a[2];        // read -> 15 (bounds-checked: ArrayIndexOutOfBoundsException)
a[2] = 42;           // write
int n = a.length;    // length (a field, not a method)
int y = v.get(2);    // ArrayList read
v.set(2, 42);        // ArrayList write`,
        python: `a = [4, 8, 15, 16, 23]    # list: a dynamic array of references
z = [0] * 1000            # 1000 zeros
x = a[2]                  # read -> 15
a[2] = 42                 # write
n = len(a)                # length
last = a[-1]              # negative index counts from the end -> 23

import array
ints = array.array('i', [4, 8, 15])   # a real packed array of C ints`,
        js: `const a = [4, 8, 15, 16, 23];        // dynamic array
const z = new Array(1000).fill(0);   // 1000 zeros
const t = new Int32Array(1000);      // typed array: packed 4-byte ints

const x = a[2];      // read -> 15
a[2] = 42;           // write
const n = a.length;  // length
a[10];               // undefined — no error, a silent bug`,
        c: `#include <stdlib.h>

int a[5] = {4, 8, 15, 16, 23};           /* fixed size */
int *d = malloc(1000 * sizeof(int));     /* heap block of 1000 ints */

int x = a[2];          /* read -> 15 */
a[2] = 42;             /* write */
int n = sizeof(a) / sizeof(a[0]);   /* length: only works on real arrays, not pointers */
/* a[10] is undefined behaviour: C does no bounds checking at all */
free(d);`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Out of bounds',
      md: `Reading \`arr[n]\` (one past the end) or \`arr[-1]\` is the classic array bug. **Java** and **Python** stop with an error; **JavaScript** quietly returns \`undefined\`; **C and C++** do no check at all and read whatever memory is there — *undefined behaviour*, the root of many security holes. When you write a loop, check both the first and the last iteration.`,
    },
    {
      t: 'complexity',
      title: 'Cost of the basic operations',
      rows: [
        { op: 'Read arr[i]', time: 'O(1)', space: 'O(1)', note: 'address = base + i × size' },
        { op: 'Write arr[i] = v', time: 'O(1)', space: 'O(1)' },
        { op: 'Find the length', time: 'O(1)', note: 'stored alongside (except raw C pointers)' },
        { op: 'Search for a value', time: 'O(n)', note: 'no shortcut unless sorted' },
        { op: 'Insert / delete in the middle', time: 'O(n)', note: 'elements must shift' },
        { op: 'Insert / delete at the end', time: 'O(1)*', note: '*amortized for dynamic arrays' },
      ],
    },
    {
      t: 'md',
      md: `
        ## Arrays in real systems

        - **Images** are 2D arrays of pixels; **audio** is a 1D array of samples.
        - A **string** is an array of characters.
        - **Hash tables**, **heaps**, **stacks**, **queues** and **matrices** are all built on top of arrays.
        - Databases and search engines pack data into arrays for speed — scanning contiguous memory can be 10–100× faster than chasing pointers.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-address', 'arr-q-zero-index', 'arr-q-access-cost', 'arr-q-oob-lang', 'arr-q-last-index'] },
  ],
}

export const traversal: Page = {
  id: 'traversal',
  title: 'Traversal and one-pass computations',
  summary: 'Visiting every element once — sums, maxima, counts — and the bugs hiding in "simple" loops.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        **Traversing** an array means visiting each element exactly once, usually from index 0 to $n-1$. It is the most common thing you will ever do with an array, and a surprising number of problems are "traverse once while keeping a few variables up to date".

        ## The accumulator pattern

        Keep a small amount of state — a running sum, the best value so far, a counter — and update it as each element goes by. After one pass the state holds the answer. Time is **O(n)**, extra space **O(1)**.
      `,
    },
    { t: 'viz', algo: 'arr-traverse', caption: 'Sum and maximum in a single pass. Watch how "best" only changes when a larger value appears.' },
    {
      t: 'md',
      md: `
        ### Initialise with care

        - For a **sum** start at \`0\` (the identity for addition); for a **product** start at \`1\`.
        - For a **maximum** start at \`arr[0]\` — **not at 0**. With \`[-5, -2, -9]\` a start of 0 would report 0, a value that is not even in the array. (Or use $-\\infty$: \`INT_MIN\`, \`Integer.MIN_VALUE\`, \`float('-inf')\`, \`-Infinity\`.)
        - For a **minimum** start at \`arr[0]\` or $+\\infty$.

        ### Watch the sum's type

        Adding up $10^5$ values each up to $10^9$ gives up to $10^{14}$ — far beyond a 32-bit \`int\` (max ≈ $2.1 \\times 10^9$). In C, C++ and Java, accumulate into a **64-bit** \`long long\` / \`long\`. Python integers never overflow; JavaScript numbers are exact up to $2^{53}$.
      `,
    },
    {
      t: 'code',
      title: 'Common one-pass computations',
      code: {
        cpp: `long long total = 0; int mx = a[0], mn = a[0], evens = 0;
for (int x : a) {                 // range-based for: read-only traversal
    total += x;
    mx = max(mx, x);
    mn = min(mn, x);
    if (x % 2 == 0) evens++;
}
double avg = (double)total / a.size();
// backwards:
for (int i = (int)a.size() - 1; i >= 0; i--) cout << a[i] << ' ';`,
        java: `long total = 0; int mx = a[0], mn = a[0], evens = 0;
for (int x : a) {                 // enhanced for
    total += x;
    mx = Math.max(mx, x);
    mn = Math.min(mn, x);
    if (x % 2 == 0) evens++;
}
double avg = (double) total / a.length;
for (int i = a.length - 1; i >= 0; i--) System.out.print(a[i] + " ");`,
        python: `total = sum(a)
mx, mn = max(a), min(a)
evens = sum(1 for x in a if x % 2 == 0)
avg = total / len(a)
for i, x in enumerate(a):          # index and value together
    ...
for x in reversed(a):              # backwards without copying
    print(x, end=' ')`,
        js: `let total = 0, mx = a[0], mn = a[0], evens = 0;
for (const x of a) {
  total += x;
  mx = Math.max(mx, x);
  mn = Math.min(mn, x);
  if (x % 2 === 0) evens++;
}
const avg = total / a.length;
// or: a.reduce((s, x) => s + x, 0), Math.max(...a) (only for small arrays)
for (let i = a.length - 1; i >= 0; i--) console.log(a[i]);`,
        c: `long long total = 0; int mx = a[0], mn = a[0], evens = 0;
for (int i = 0; i < n; i++) {
    total += a[i];
    if (a[i] > mx) mx = a[i];
    if (a[i] < mn) mn = a[i];
    if (a[i] % 2 == 0) evens++;
}
double avg = (double)total / n;
for (int i = n - 1; i >= 0; i--) printf("%d ", a[i]);`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Off-by-one',
      md: `\`for (i = 0; i <= n; i++)\` runs $n + 1$ times and reads \`a[n]\`. The safe habit: **half-open ranges** — start inclusive, end exclusive: \`for (i = 0; i < n; i++)\`. The loop then runs exactly *end − start* times. Going backwards, start at $n - 1$ and continue while \`i >= 0\` (careful: with an unsigned \`size_t\`, \`i >= 0\` is always true!).`,
    },
    {
      t: 'md',
      md: `
        ## Second largest — a traversal with two variables

        Tracking the **second largest distinct** value is a classic warm-up that tests careful updates. Keep \`first\` and \`second\`:

        - if \`x > first\`: the old first becomes second, \`x\` becomes first;
        - else if \`first > x > second\`: \`x\` becomes second.

        The strict comparisons skip duplicates of the maximum. One pass, O(1) space — no sorting (which would be O(n log n)).
      `,
    },
    {
      t: 'code',
      title: 'Second largest distinct value (or none)',
      code: {
        cpp: `long long first = LLONG_MIN, second = LLONG_MIN;
for (int x : a) {
    if (x > first) { second = first; first = x; }
    else if (x < first && x > second) second = x;
}
// second == LLONG_MIN  ->  no second distinct value`,
        java: `long first = Long.MIN_VALUE, second = Long.MIN_VALUE;
for (int x : a) {
    if (x > first) { second = first; first = x; }
    else if (x < first && x > second) second = x;
}`,
        python: `first = second = float('-inf')
for x in a:
    if x > first:
        first, second = x, first
    elif first > x > second:
        second = x`,
        js: `let first = -Infinity, second = -Infinity;
for (const x of a) {
  if (x > first) { second = first; first = x; }
  else if (x < first && x > second) second = x;
}`,
        c: `long long first = LLONG_MIN, second = LLONG_MIN;
for (int i = 0; i < n; i++) {
    if (a[i] > first) { second = first; first = a[i]; }
    else if (a[i] < first && a[i] > second) second = a[i];
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Scanning from the right

        Nothing says a traversal must go left to right. Some questions are about **what comes after** each element — "is this bigger than everything to its right?" — and those are natural right-to-left. Walking backwards, "everything to the right" is exactly "everything seen so far", so one running value (the maximum so far) answers the question for every index in a single pass.

        An element is a **leader** if it is strictly greater than every element to its right. The last element is always a leader.
      `,
    },
    { t: 'viz', algo: 'arr-leaders', caption: 'The dim band is everything to the right, summarised by one number: its maximum.' },
    {
      t: 'md',
      md: `
        ## One pass, one candidate: the majority vote

        A **majority element** appears more than $n/2$ times. Counting every value needs a hash map (O(n) extra space). The **Boyer–Moore voting** algorithm needs two variables.

        Picture each element as a vote. Whenever two *different* values meet, both are thrown away — they cancel. A value that holds more than half of all votes cannot be cancelled completely: even if every other vote is spent against it, some of its votes remain. So after one pass the survivor is the only possible majority.

        The survivor is only a *candidate*: if there is no majority, some value still survives. A second pass counts it to confirm.
      `,
    },
    { t: 'viz', algo: 'arr-majority', caption: 'The stack holds the candidate’s uncancelled votes. A different value pops one.' },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Why interviewers like it',
      md: `Majority vote is the classic "O(1) space" follow-up to a problem that looks like it needs counting. Be ready to explain **why** the survivor must be the majority (cancelling argument) and **why** a verification pass is still needed.`,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-max-init', 'arr-q-loop-count', 'arr-q-trace-sum', 'arr-q-overflow', 'arr-q-second', 'arr-q-fill-max', 'arr-q-leaders-trace', 'arr-q-majority-trace', 'arr-q-majority-verify'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-sum', 'arr-c-max-min', 'arr-c-second', 'arr-c-leaders', 'arr-c-majority'] },
  ],
}

export const insertDelete: Page = {
  id: 'insert-delete',
  title: 'Inserting and deleting — the cost of shifting',
  summary: 'Why an array must move elements to open or close a gap, and the tricks that avoid it.',
  minutes: 11,
  blocks: [
    {
      t: 'md',
      md: `
        Arrays have no holes. Every index from 0 to $n-1$ must hold a value, in order. So to **insert** at position $k$ you must first open a gap by moving every element from $k$ to the end **one slot to the right**; to **delete** at $k$ you close the gap by moving everything after it **one slot to the left**.

        ## Insert at position k

        Move from the **right end** backwards. If you went left-to-right, \`a[k+1] = a[k]\` would overwrite \`a[k+1]\` before it had been copied, smearing one value across the whole tail.
      `,
    },
    { t: 'viz', algo: 'arr-insert', caption: 'Values slide right, starting from the end, to open a gap at k.' },
    {
      t: 'md',
      md: `
        The number of moves is $n - k$. Inserting at the front ($k = 0$) moves all $n$ elements — **O(n)**. Inserting at the end ($k = n$) moves none — **O(1)**, provided there is spare capacity.

        ## Delete at position k

        Now move **left-to-right**: \`a[j] = a[j + 1]\` for $j = k \\ldots n-2$, then shrink $n$.
      `,
    },
    { t: 'viz', algo: 'arr-delete', caption: 'Everything after k slides one step left to close the gap.' },
    {
      t: 'complexity',
      rows: [
        { op: 'Insert at the end (room available)', time: 'O(1)' },
        { op: 'Insert at position k', time: 'O(n − k)', note: 'O(n) worst case, at the front' },
        { op: 'Delete the last element', time: 'O(1)' },
        { op: 'Delete at position k', time: 'O(n − k)', note: 'O(n) worst case' },
        { op: 'Delete when order does not matter', time: 'O(1)', note: 'swap with the last, then pop' },
      ],
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'When order does not matter: swap-and-pop',
      md: `If you only need the *set* of values, delete \`a[k]\` in O(1): copy the **last** element into slot $k$ and shrink by one. Games, particle systems and many interview solutions use this to avoid O(n) shifts.`,
    },
    {
      t: 'code',
      title: 'Swap-and-pop removal (order not preserved)',
      code: {
        cpp: `void removeUnordered(vector<int>& a, int k) {
    a[k] = a.back();   // overwrite with the last element
    a.pop_back();      // O(1)
}`,
        java: `static int removeUnordered(int[] a, int n, int k) {
    a[k] = a[n - 1];
    return n - 1;      // new length
}`,
        python: `def remove_unordered(a, k):
    a[k] = a[-1]
    a.pop()            # popping the end is O(1)`,
        js: `function removeUnordered(a, k) {
  a[k] = a[a.length - 1];
  a.pop();
}`,
        c: `int remove_unordered(int *a, int n, int k) {
    a[k] = a[n - 1];
    return n - 1;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Built-ins do the same work

        \`vector::insert\` / \`erase\`, \`ArrayList.add(i, x)\` / \`remove(i)\`, Python's \`list.insert\` / \`del\` / \`pop(i)\`, and JavaScript's \`splice\` all shift elements internally. They are convenient, not free: calling \`list.insert(0, x)\` inside a loop turns an O(n) algorithm into O(n²). If you need fast insertion at **both ends**, use a deque (\`std::deque\`, \`ArrayDeque\`, \`collections.deque\`).
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-insert-moves', 'arr-q-insert-order', 'arr-q-trace-insert', 'arr-q-trace-delete', 'arr-q-pop0', 'arr-q-fill-insert', 'arr-q-match-ops'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-insert', 'arr-c-delete'] },
  ],
}

export const searching: Page = {
  id: 'searching',
  title: 'Searching an unsorted array',
  summary: 'Linear search, its best/average/worst cases, and variations that come up constantly.',
  minutes: 9,
  blocks: [
    {
      t: 'md',
      md: `
        Given an array in **no particular order**, the only way to find a value is to look at elements until you find it or run out. That is **linear search**.
      `,
    },
    { t: 'viz', algo: 'arr-linear-search', caption: 'Change the target to a value that is not in the array to see the worst case.' },
    {
      t: 'md',
      md: `
        ## How many comparisons?

        | case | when | comparisons |
        |---|---|---|
        | best | target is at index 0 | 1 |
        | worst | target is last, or absent | $n$ |
        | average (target present, uniformly placed) | — | $\\frac{n+1}{2}$ |

        All of these except the best case grow linearly, so linear search is **O(n)**. If you will search the *same* array many times, it pays to **sort it once** (O(n log n)) and then use **binary search** (O(log n) per query) — or build a **hash set** for O(1) average lookups. Both have their own chapters.

        ## Variations you will meet

        - **First occurrence** — return at the first match (above).
        - **Last occurrence** — scan from the right, or keep overwriting the answer.
        - **Count occurrences** — no early exit; add 1 on every match.
        - **All positions** — collect every matching index.
        - **Any element satisfying a condition** — the comparison becomes a test, e.g. "first negative number".
      `,
    },
    {
      t: 'code',
      title: 'Last occurrence and count',
      code: {
        cpp: `int lastIndex(const vector<int>& a, int x) {
    for (int i = (int)a.size() - 1; i >= 0; i--) if (a[i] == x) return i;
    return -1;
}
int countOf(const vector<int>& a, int x) {
    return count(a.begin(), a.end(), x);    // <algorithm>
}`,
        java: `static int lastIndex(int[] a, int x) {
    for (int i = a.length - 1; i >= 0; i--) if (a[i] == x) return i;
    return -1;
}
static int countOf(int[] a, int x) {
    int c = 0; for (int v : a) if (v == x) c++; return c;
}`,
        python: `def last_index(a, x):
    for i in range(len(a) - 1, -1, -1):
        if a[i] == x:
            return i
    return -1

count = a.count(x)          # built-in
first = a.index(x)          # raises ValueError if absent`,
        js: `const lastIndex = a.lastIndexOf(x);   // -1 if absent
const first = a.indexOf(x);
const count = a.filter(v => v === x).length;
const firstNeg = a.findIndex(v => v < 0);`,
        c: `int last_index(const int *a, int n, int x) {
    for (int i = n - 1; i >= 0; i--) if (a[i] == x) return i;
    return -1;
}
int count_of(const int *a, int n, int x) {
    int c = 0; for (int i = 0; i < n; i++) if (a[i] == x) c++; return c;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'tip',
      title: 'The sentinel trick',
      md: `A tight loop checks two things each time: \`i < n\` and \`a[i] == x\`. Put \`x\` itself at \`a[n]\` (a spare slot) and the bounds check disappears — the loop is guaranteed to stop at the sentinel. Afterwards, \`i == n\` means "not found". A micro-optimisation, but a lovely example of changing the data to simplify the code.`,
    },
    { t: 'viz', algo: 'arr-sentinel', caption: 'The purple slot is the planted sentinel. Count the comparisons against the plain loop, then try an x that really is the last element.' },
    {
      t: 'md',
      md: `
        ### Why the sentinel version is still correct

        The plain loop stops for one of two reasons (found, or ran out); the sentinel loop stops for only one (found) because \`x\` is guaranteed to be at index $n - 1$. That shifts the "ran out" question to after the loop: if it stopped *before* $n - 1$, it found a real match; if it stopped *at* $n - 1$, the original last element decides (\`last == x\` means found, otherwise absent). Restoring \`a[n − 1]\` keeps the function free of side effects.

        This saves one comparison per element — roughly halving the loop's tests. Modern compilers and CPUs make the saving small, but the idea — **change the data so the loop needs fewer cases** — reappears everywhere: dummy head nodes in linked lists, padding a grid with a border of walls, \`P[0] = 0\` in prefix sums, $+\\infty$ at the end of each half in merge sort.
      `,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-linear-worst', 'arr-q-linear-avg', 'arr-q-search-many', 'arr-q-first-last', 'arr-q-sentinel'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-linear-search', 'arr-c-count'] },
  ],
}

export const reverseRotate: Page = {
  id: 'reverse-rotate',
  title: 'Reversing and rotating in place',
  summary: 'Two pointers that meet in the middle, and the three-reversal trick for rotation.',
  minutes: 12,
  blocks: [
    {
      t: 'md',
      md: `
        ## Reverse in place

        Put \`lo\` at the first element and \`hi\` at the last. Swap them, step both inward, repeat until they meet. Each swap puts **two** elements in their final place, so only $\\lfloor n/2 \\rfloor$ swaps are needed and **no second array** is used.
      `,
    },
    { t: 'viz', algo: 'arr-reverse', caption: 'Try an even and an odd length: with odd n the middle element never moves.' },
    {
      t: 'md',
      md: `
        ## Rotate right by k

        Rotating \`[1 2 3 4 5 6 7]\` right by 3 gives \`[5 6 7 1 2 3 4]\`: the last $k$ elements wrap around to the front.

        **The easy way** uses a second array: element $i$ goes to position $(i + k) \\bmod n$. That is O(n) time but O(n) extra space.

        **The in-place way** uses three reversals:

        1. reverse the whole array → \`7 6 5 4 3 2 1\`
        2. reverse the first $k$ → \`5 6 7 4 3 2 1\`
        3. reverse the rest → \`5 6 7 1 2 3 4\`

        Why it works: write the array as two blocks $A\\,B$ where $B$ is the last $k$ elements. Reversing everything gives $B^R A^R$ (both blocks swapped *and* each backwards). Reversing each block again restores their inner order: $B\\,A$. That is exactly the rotation.
      `,
    },
    { t: 'viz', algo: 'arr-rotate', caption: 'Three reversals: whole, first k, rest. Try k larger than n — only k mod n matters.' },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Always reduce k first',
      md: `Rotating by $n$ does nothing, so rotating by $k$ equals rotating by $k \\bmod n$. Skip this and \`reverse(0, k − 1)\` walks off the end when $k > n$. And guard $n = 0$ before taking \`k % n\`!`,
    },
    {
      t: 'md',
      md: `
        ### Left rotation

        Rotating **left** by $k$ is rotating right by $n - k$. Or reverse the first $k$, reverse the rest, then reverse everything — the same three steps in the other order.
      `,
    },
    {
      t: 'code',
      title: 'Rotation with an extra array (simple and O(n) space)',
      code: {
        cpp: `vector<int> rotated(const vector<int>& a, int k) {
    int n = a.size(); k %= n;
    vector<int> r(n);
    for (int i = 0; i < n; i++) r[(i + k) % n] = a[i];
    return r;
}   // std::rotate(a.begin(), a.begin() + (n - k), a.end()) rotates right in place`,
        java: `static int[] rotated(int[] a, int k) {
    int n = a.length; k %= n;
    int[] r = new int[n];
    for (int i = 0; i < n; i++) r[(i + k) % n] = a[i];
    return r;
}   // Collections.rotate(list, k) for lists`,
        python: `def rotated(a, k):
    k %= len(a)
    return a[-k:] + a[:-k] if k else a[:]   # slicing makes the copy

from collections import deque
d = deque(a); d.rotate(k)   # O(k)`,
        js: `function rotated(a, k) {
  const n = a.length; k %= n;
  return [...a.slice(n - k), ...a.slice(0, n - k)];
}`,
        c: `void rotated(const int *a, int n, int k, int *r) {
    k %= n;
    for (int i = 0; i < n; i++) r[(i + k) % n] = a[i];
}`,
      },
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-reverse-swaps', 'arr-q-trace-rotate', 'arr-q-rotate-mod', 'arr-q-rotate-steps', 'arr-q-rotate-left', 'arr-q-fill-reverse'] },
    { t: 'practice', title: 'Practice', ids: ['arr-c-reverse', 'arr-c-rotate'] },
  ],
}

export const dynamicArrays: Page = {
  id: 'dynamic-arrays',
  title: 'Dynamic arrays and amortized O(1)',
  summary: 'How vector, ArrayList, list and JS arrays grow — and why doubling makes append cheap on average.',
  minutes: 13,
  blocks: [
    {
      t: 'md',
      md: `
        A plain array cannot grow: the memory right after it may belong to something else. A **dynamic array** (C++ \`vector\`, Java \`ArrayList\`, Python \`list\`, JavaScript \`Array\`) hides this by keeping two numbers:

        - **size** — how many elements are in use;
        - **capacity** — how many slots the current buffer has.

        Appending when \`size < capacity\` is just a write — O(1). When the buffer is **full**, the array allocates a new, **bigger** buffer, copies every element across, frees the old one, and then appends.
      `,
    },
    { t: 'viz', algo: 'arr-dynamic', caption: 'Watch the copies: they happen only at sizes 1, 2, 4, 8… and get rarer as the array grows.' },
    {
      t: 'md',
      md: `
        ## Why "multiply", not "add"

        Suppose the array grows by a **constant** — say 10 slots — each time. Appending $n$ elements triggers a copy every 10 appends, and the copies cost $10 + 20 + 30 + \\ldots + n \\approx \\frac{n^2}{20}$: **O(n²)** total, O(n) per append on average. Terrible.

        Now **double** the capacity instead. Copies happen at sizes $1, 2, 4, 8, \\ldots$ up to $n$, costing

        $$1 + 2 + 4 + \\cdots + \\frac{n}{2} + n < 2n$$

        So $n$ appends cost fewer than $n$ writes plus $2n$ copies: **O(n) in total, O(1) per append on average**. This is called **amortized O(1)**: an individual append can be slow (a big copy), but spread over all appends the cost per operation is constant.

        ## Growth factor

        Any factor $> 1$ gives amortized O(1). The trade-off is memory: factor 2 can waste up to half the buffer. **Java's ArrayList uses 1.5**, **CPython grows by roughly 1.125× plus a constant**, and C++ implementations use 1.5 or 2.

        ## Shrinking

        If you shrink when the array becomes **half** full, alternating push/pop at the boundary can resize every single time. Real implementations shrink only when a quarter full (or not at all). In C++, \`shrink_to_fit()\` asks for it explicitly.
      `,
    },
    {
      t: 'code',
      title: 'Reserving capacity up front',
      code: {
        cpp: `vector<int> v;
v.reserve(1'000'000);          // one allocation, no copies while pushing
for (int i = 0; i < 1'000'000; i++) v.push_back(i);
cout << v.size() << ' ' << v.capacity();`,
        java: `ArrayList<Integer> v = new ArrayList<>(1_000_000);   // initial capacity
for (int i = 0; i < 1_000_000; i++) v.add(i);
v.ensureCapacity(2_000_000);`,
        python: `v = [0] * 1_000_000          # pre-size, then assign by index
# or build in one shot:
v = list(range(1_000_000))
v = [i * i for i in range(10)]   # comprehensions pre-size efficiently`,
        js: `const v = new Array(1_000_000);     // length 1e6 (holes!)
for (let i = 0; i < v.length; i++) v[i] = i;
const t = new Int32Array(1_000_000); // fixed-size, packed, fastest`,
        c: `int *v = malloc(cap * sizeof(int));
/* when full: */
cap *= 2;
int *tmp = realloc(v, cap * sizeof(int));   /* may grow in place, else copies */
if (!tmp) { /* allocation failed: v is still valid */ }
v = tmp;`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Stale pointers after a resize',
      md: `In C++, a \`push_back\` that reallocates **invalidates every pointer, reference and iterator** into the vector — they still point at the freed buffer. Iterating a vector while pushing onto it is a classic crash. Java and Python protect you from dangling memory but you can still hit \`ConcurrentModificationException\` or logic bugs by growing a list while looping over it.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'push_back / append / add', time: 'O(1) amortized', note: 'O(n) for the occasional resize' },
        { op: 'pop_back / pop()', time: 'O(1)' },
        { op: 'index read/write', time: 'O(1)' },
        { op: 'insert / erase in the middle', time: 'O(n)' },
        { op: 'extra memory', time: '—', space: 'up to ~2× size', note: 'with growth factor 2' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-amortized', 'arr-q-copies', 'arr-q-growth-add', 'arr-q-capacity-after', 'arr-q-invalidate'] },
  ],
}
