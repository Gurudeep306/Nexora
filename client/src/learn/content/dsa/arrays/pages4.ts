import type { Page } from '../../../types'

export const prefixHashing: Page = {
  id: 'prefix-hashing',
  title: 'Prefix sums + hashing: counting subarrays, prefix XOR and prefix products',
  summary: 'Turn "how many subarrays have sum k" into "how many earlier prefixes equal P − k" — the single most reused idea in array interviews — plus its XOR, modulo and product cousins.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        > **Subarray sum equals k.** Given an integer array (negatives allowed) and a target $k$, count the contiguous subarrays whose sum is exactly $k$.

        \`a = [3, 4, −7, 1, 3, 3, 1, −4]\`, $k = 7$ → **4** subarrays: \`[3, 4]\`, \`[3, 4, −7, 1, 3, 3]\`, \`[1, 3, 3]\`, \`[3, 3, 1]\`.

        **Brute force** tries every pair $(l, r)$: with a running sum that is $O(n^2)$ — too slow for $n = 2 \\cdot 10^5$. **The sliding window does not work here**: with negative numbers, extending a window can *decrease* its sum, so there is no rule for when to shrink. We need a different lens.

        ## Re-read the condition through prefix sums

        With $P[i] = a[0] + \\cdots + a[i-1]$ (so $P[0] = 0$):

        $$\\text{sum}(l..r) = P[r+1] - P[l] = k \\iff P[l] = P[r+1] - k.$$

        **Fix the right end.** For each $r$, the number of good subarrays ending at $r$ equals *the number of earlier prefix sums equal to $P[r+1] - k$*. If we keep a hash map from "prefix value" to "how many times seen so far", that count is one lookup. Then add $P[r+1]$ to the map and move on.

        $$\\text{answer} = \\sum_{r=0}^{n-1} \\#\\{\\, l \\le r : P[l] = P[r+1] - k \\,\\}$$
      `,
    },
    { t: 'viz', algo: 'arr-subarray-sum-k', caption: 'Each step: extend the prefix, look up P − k (purple bucket), then record P. Gold ranges are the subarrays just counted. Note the map starts with 0 → 1.' },
    {
      t: 'steps',
      title: 'Why it is correct',
      items: [
        { title: 'Every subarray is counted once', md: 'A subarray $(l, r)$ is counted exactly when the loop is at its right end $r$, and only if $P[l]$ is in the map at that moment — which it is, because $l \\le r$ means $P[l]$ was inserted earlier (or is the initial 0).' },
        { title: 'Nothing else is counted', md: 'The map only ever contains $P[0], \\ldots, P[r]$ when we look up at $r$ (we look up *before* inserting $P[r+1]$), so every match corresponds to a real $l \\le r$, a non-empty subarray.' },
        { title: 'Why seed with {0: 1}', md: '$P[0] = 0$ is the prefix of length zero. Without it, subarrays starting at index 0 (those with $P[r+1] = k$) would be missed.' },
        { title: 'Order matters', md: 'Look up first, then insert. Inserting $P[r+1]$ before looking up would, when $k = 0$, count the empty subarray $(r+1, r)$.' },
      ],
    },
    {
      t: 'code',
      title: 'Subarray sum equals k — O(n) with a hash map',
      code: {
        cpp: `long long countSubarrays(const vector<int>& a, long long k) {
    unordered_map<long long, long long> seen;
    seen.reserve(a.size() * 2);
    seen[0] = 1;
    long long P = 0, count = 0;
    for (int x : a) {
        P += x;
        auto it = seen.find(P - k);
        if (it != seen.end()) count += it->second;
        seen[P]++;
    }
    return count;
}`,
        java: `static long countSubarrays(int[] a, long k) {
    HashMap<Long, Integer> seen = new HashMap<>();
    seen.put(0L, 1);
    long P = 0, count = 0;
    for (int x : a) {
        P += x;
        count += seen.getOrDefault(P - k, 0);
        seen.merge(P, 1, Integer::sum);
    }
    return count;
}`,
        python: `def count_subarrays(a, k):
    seen = {0: 1}
    P = count = 0
    for x in a:
        P += x
        count += seen.get(P - k, 0)
        seen[P] = seen.get(P, 0) + 1
    return count`,
        js: `function countSubarrays(a, k) {
  const seen = new Map([[0, 1]]);
  let P = 0, count = 0;
  for (const x of a) {
    P += x;
    count += seen.get(P - k) ?? 0;
    seen.set(P, (seen.get(P) ?? 0) + 1);
  }
  return count;
}`,
        c: `/* No hash map in C: sort the n + 1 prefixes and count, for each P[r+1],
   how many EARLIER prefixes equal P[r+1] - k. Simplest O(n log n) way:
   process prefixes in order while keeping a sorted structure is awkward in C,
   so instead count pairs (l < r') with P[r'] - P[l] = k via sorting (value, index). */
#include <stdlib.h>
typedef struct { long long v; int i; } Pre;
static int cmp(const void *x, const void *y) {
    const Pre *a = x, *b = y;
    if (a->v != b->v) return a->v < b->v ? -1 : 1;
    return a->i - b->i;
}
long long count_subarrays(const int *a, int n, long long k) {
    Pre *p = malloc((n + 1) * sizeof(Pre));
    p[0].v = 0; p[0].i = 0;
    for (int j = 0; j < n; j++) { p[j + 1].v = p[j].v + a[j]; p[j + 1].i = j + 1; }
    Pre *s = malloc((n + 1) * sizeof(Pre));
    for (int j = 0; j <= n; j++) s[j] = p[j];
    qsort(s, n + 1, sizeof(Pre), cmp);
    long long count = 0;
    for (int j = 1; j <= n; j++) {               /* earlier prefixes with value P[j] - k and index < j */
        long long want = p[j].v - k;
        int lo = 0, hi = n + 1;                  /* first position with (v, i) >= (want, 0) */
        while (lo < hi) { int m = (lo + hi) / 2; if (s[m].v < want) lo = m + 1; else hi = m; }
        int L = lo; lo = L; hi = n + 1;          /* first position with v == want and i >= j */
        while (lo < hi) { int m = (lo + hi) / 2; if (s[m].v == want && s[m].i < j) lo = m + 1; else hi = m; }
        count += lo - L;
    }
    free(p); free(s);
    return count;
}`,
      },
      note: 'C has no standard hash map; the sort-plus-binary-search version is O(n log n) and needs no extra library. In contests, C++ unordered_map can be attacked with anti-hash tests — a custom hash or map (O(n log n)) is the safe choice.',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Where solutions break',
      md: `- **Forgetting \`seen[0] = 1\`** — misses every subarray that starts at index 0.
- **Using a sliding window with negatives** — gives wrong answers on inputs like \`[1, −1, 1]\`, $k = 1$ (answer 3).
- **Overflow** — the prefix can reach $n \\cdot \\max|a_i|$, e.g. $2 \\cdot 10^5 \\times 10^9$: use 64-bit keys. The *count* can reach $n(n+1)/2 \\approx 2 \\cdot 10^{10}$ (all zeros, $k = 0$): 64-bit too.
- **Returning the count of distinct prefixes** instead of adding the stored multiplicity.`,
    },
    {
      t: 'md',
      md: `
        ## Longest subarray with sum k

        Same identity, different question: among all $l$ with $P[l] = P[r+1] - k$, we want the one giving the **longest** subarray — the **smallest** $l$. So the map stores the **first index** at which each prefix value appears, and we never overwrite it.
      `,
    },
    { t: 'viz', algo: 'arr-longest-sum-k', caption: 'Watch the "keep the earlier one" frames: when a prefix value repeats, the map is deliberately not updated.' },
    {
      t: 'code',
      title: 'Longest subarray with sum k (any integers)',
      code: {
        cpp: `int longestWithSum(const vector<int>& a, long long k) {
    unordered_map<long long, int> first{{0, 0}};
    long long P = 0; int best = 0;
    for (int j = 0; j < (int)a.size(); j++) {
        P += a[j];
        auto it = first.find(P - k);
        if (it != first.end()) best = max(best, j + 1 - it->second);
        first.emplace(P, j + 1);         // does nothing if P is already there
    }
    return best;
}`,
        java: `static int longestWithSum(int[] a, long k) {
    HashMap<Long, Integer> first = new HashMap<>();
    first.put(0L, 0);
    long P = 0; int best = 0;
    for (int j = 0; j < a.length; j++) {
        P += a[j];
        Integer i = first.get(P - k);
        if (i != null) best = Math.max(best, j + 1 - i);
        first.putIfAbsent(P, j + 1);
    }
    return best;
}`,
        python: `def longest_with_sum(a, k):
    first = {0: 0}
    P = best = 0
    for j, x in enumerate(a):
        P += x
        i = first.get(P - k)
        if i is not None:
            best = max(best, j + 1 - i)
        first.setdefault(P, j + 1)
    return best`,
        js: `function longestWithSum(a, k) {
  const first = new Map([[0, 0]]);
  let P = 0, best = 0;
  for (let j = 0; j < a.length; j++) {
    P += a[j];
    if (first.has(P - k)) best = Math.max(best, j + 1 - first.get(P - k));
    if (!first.has(P)) first.set(P, j + 1);
  }
  return best;
}`,
        c: `/* Positive values only: the sliding window below is O(n) time, O(1) space.
   (For arbitrary signs use the hash-map method above, or sort prefixes.) */
int longest_with_sum_positive(const int *a, int n, long long k) {
    long long s = 0; int lo = 0, best = 0;
    for (int hi = 0; hi < n; hi++) {
        s += a[hi];
        while (s > k && lo <= hi) s -= a[lo++];
        if (s == k && hi - lo + 1 > best) best = hi - lo + 1;
    }
    return best;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'insight',
      title: 'Positives only? Then the window is back',
      md: `When every value is **positive**, the sum of a window grows as it extends and shrinks as it contracts — the condition is *monotone*. The sliding window (shown in the C tab) then solves "longest subarray with sum k" and "longest subarray with sum ≤ k" in $O(n)$ time and **$O(1)$ space**. With zeros or negatives allowed, fall back to the hash map. Always ask: "can values be negative?"`,
    },
    {
      t: 'md',
      md: `
        ## The same trick in disguise

        Any condition of the form **"f(prefix at r) relates to f(prefix at l)"** fits the template: walk $r$, look up the matching earlier prefixes, insert the current one.

        | problem | prefix quantity | lookup at r |
        |---|---|---|
        | count subarrays with sum $k$ | $P$ | count of $P - k$ |
        | longest subarray with sum $k$ | $P$ | first index of $P - k$ |
        | count subarrays with sum divisible by $m$ | $P \\bmod m$ | count of the same remainder |
        | longest subarray with equal 0s and 1s | $P$ with 0 → −1 | first index of the same $P$ |
        | count subarrays with XOR $= k$ | $X$ = prefix XOR | count of $X \\oplus k$ |
        | count subarrays with exactly $k$ odd numbers | number of odds so far | count of $(\\text{odds} - k)$ |
        | count "nice" subarrays with sum in a range | $P$ | sorted structure / two counts |

        **Divisible by m.** $P[r+1] - P[l] \\equiv 0 \\pmod m \\iff P[r+1] \\equiv P[l] \\pmod m$. Pair equal remainders. In C, C++, Java and JavaScript, \`%\` of a negative number is negative: normalise with \`((P % m) + m) % m\`.

        **Equal 0s and 1s.** Replace each 0 by −1; a subarray is balanced exactly when its sum is 0, i.e. when two prefixes are equal. Longest such subarray: first occurrence of each prefix.

        ## Prefix XOR

        XOR is its own inverse ($x \\oplus x = 0$), so it behaves like addition *and* subtraction at once. With $X[0] = 0$, $X[i+1] = X[i] \\oplus a[i]$:

        $$a[l] \\oplus a[l+1] \\oplus \\cdots \\oplus a[r] = X[r+1] \\oplus X[l].$$

        Proof: $X[r+1] = (a[0] \\oplus \\cdots \\oplus a[l-1]) \\oplus (a[l] \\oplus \\cdots \\oplus a[r]) = X[l] \\oplus \\text{xor}(l..r)$; XOR both sides with $X[l]$. So range-XOR queries are $O(1)$, and "subarrays with XOR $k$" counts earlier prefixes equal to $X[r+1] \\oplus k$.
      `,
    },
    {
      t: 'code',
      title: 'Divisible-by-m count and XOR-equals-k count',
      code: {
        cpp: `long long countDivisible(const vector<int>& a, int m) {
    vector<long long> cnt(m, 0); cnt[0] = 1;
    long long P = 0, ans = 0;
    for (int x : a) {
        P = ((P + x) % m + m) % m;      // keep the remainder non-negative
        ans += cnt[P]++;
    }
    return ans;
}
long long countXor(const vector<int>& a, int k) {
    unordered_map<int, long long> seen{{0, 1}};
    int X = 0; long long ans = 0;
    for (int x : a) {
        X ^= x;
        auto it = seen.find(X ^ k);
        if (it != seen.end()) ans += it->second;
        seen[X]++;
    }
    return ans;
}`,
        java: `static long countDivisible(int[] a, int m) {
    long[] cnt = new long[m]; cnt[0] = 1;
    long P = 0, ans = 0;
    for (int x : a) {
        P = ((P + x) % m + m) % m;
        ans += cnt[(int) P]++;
    }
    return ans;
}
static long countXor(int[] a, int k) {
    HashMap<Integer, Long> seen = new HashMap<>();
    seen.put(0, 1L);
    int X = 0; long ans = 0;
    for (int x : a) {
        X ^= x;
        ans += seen.getOrDefault(X ^ k, 0L);
        seen.merge(X, 1L, Long::sum);
    }
    return ans;
}`,
        python: `def count_divisible(a, m):
    cnt = [0] * m
    cnt[0] = 1
    P = ans = 0
    for x in a:
        P = (P + x) % m                 # Python's % is already non-negative for m > 0
        ans += cnt[P]
        cnt[P] += 1
    return ans

def count_xor(a, k):
    seen = {0: 1}
    X = ans = 0
    for x in a:
        X ^= x
        ans += seen.get(X ^ k, 0)
        seen[X] = seen.get(X, 0) + 1
    return ans`,
        js: `function countDivisible(a, m) {
  const cnt = new Array(m).fill(0); cnt[0] = 1;
  let P = 0, ans = 0;
  for (const x of a) {
    P = (((P + x) % m) + m) % m;
    ans += cnt[P]++;
  }
  return ans;
}
function countXor(a, k) {
  const seen = new Map([[0, 1]]);
  let X = 0, ans = 0;
  for (const x of a) {
    X ^= x;
    ans += seen.get(X ^ k) ?? 0;
    seen.set(X, (seen.get(X) ?? 0) + 1);
  }
  return ans;
}`,
        c: `long long count_divisible(const int *a, int n, int m) {
    long long *cnt = calloc(m, sizeof(long long)); cnt[0] = 1;
    long long P = 0, ans = 0;
    for (int i = 0; i < n; i++) {
        P = ((P + a[i]) % m + m) % m;
        ans += cnt[P]++;
    }
    free(cnt);
    return ans;
}
/* XOR values below 2^20: a plain array is a perfect "hash map" */
long long count_xor_small(const int *a, int n, int k) {
    static long long seen[1 << 20];
    for (int i = 0; i < (1 << 20); i++) seen[i] = 0;
    seen[0] = 1;
    int X = 0; long long ans = 0;
    for (int i = 0; i < n; i++) { X ^= a[i]; ans += seen[X ^ k]; seen[X]++; }
    return ans;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Prefix products: product of array except self

        > Return \`out[i]\` = the product of all elements except \`a[i]\`, **without division**, in $O(n)$.

        Division (\`total / a[i]\`) fails as soon as there is a zero. Split the product instead:

        $$\\text{out}[i] = \\underbrace{a[0] \\cdots a[i-1]}_{\\text{prefix product}} \\times \\underbrace{a[i+1] \\cdots a[n-1]}_{\\text{suffix product}}$$

        Build the prefix products left to right *directly into* \`out\`, then sweep right to left with one running suffix product, multiplying it in. No extra arrays: $O(1)$ space besides the output.
      `,
    },
    { t: 'viz', algo: 'arr-product-except-self', caption: 'First pass: the cyan band is "everything to the left". Second pass: "everything to the right". The zero only zeroes the slots that do not exclude it.' },
    {
      t: 'code',
      title: 'Product of array except self',
      code: {
        cpp: `vector<long long> productExceptSelf(const vector<int>& a) {
    int n = a.size();
    vector<long long> out(n, 1);
    long long left = 1;
    for (int i = 0; i < n; i++) { out[i] = left; left *= a[i]; }
    long long right = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; }
    return out;
}`,
        java: `static long[] productExceptSelf(int[] a) {
    int n = a.length;
    long[] out = new long[n];
    long left = 1;
    for (int i = 0; i < n; i++) { out[i] = left; left *= a[i]; }
    long right = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; }
    return out;
}`,
        python: `def product_except_self(a):
    n = len(a)
    out = [1] * n
    left = 1
    for i in range(n):
        out[i] = left
        left *= a[i]
    right = 1
    for i in range(n - 1, -1, -1):
        out[i] *= right
        right *= a[i]
    return out`,
        js: `function productExceptSelf(a) {
  const n = a.length, out = new Array(n).fill(1);
  let left = 1;                          // switch to BigInt if products can exceed 2^53
  for (let i = 0; i < n; i++) { out[i] = left; left *= a[i]; }
  let right = 1;
  for (let i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; }
  return out;
}`,
        c: `void product_except_self(const int *a, int n, long long *out) {
    long long left = 1;
    for (int i = 0; i < n; i++) { out[i] = left; left *= a[i]; }
    long long right = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= right; right *= a[i]; }
}`,
      },
      note: 'Products grow fast: with values up to 30 and n = 12 they already pass 2⁵³. Problems usually guarantee the answers fit in 64 bits, or ask for them modulo a prime.',
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How it is asked',
      md: `"Subarray sum equals K" (and its follow-ups: divisible by K, binary subarrays, equal 0s and 1s, XOR equals K) is one of the most frequently asked array questions. The interviewer is checking that you (1) reject the sliding window because of negatives, (2) derive $P[l] = P[r+1] - k$, (3) seed the map with prefix 0, and (4) choose **count** vs **first index** depending on whether they ask "how many" or "how long". "Product except self" checks the prefix/suffix split and the follow-up "now in O(1) extra space".`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Count subarrays with sum k', time: 'O(n) average', space: 'O(n)', note: 'hash map of prefix counts' },
        { op: 'Longest subarray with sum k (any signs)', time: 'O(n) average', space: 'O(n)', note: 'first occurrence of each prefix' },
        { op: 'Longest subarray with sum k (positives)', time: 'O(n)', space: 'O(1)', note: 'sliding window' },
        { op: 'Count subarrays divisible by m', time: 'O(n + m)', space: 'O(m)' },
        { op: 'Range XOR query', time: 'O(1)', space: 'O(n)', note: 'X[r+1] ⊕ X[l]' },
        { op: 'Product of array except self', time: 'O(n)', space: 'O(1) extra' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-ph-count', 'arr-q-ph-seed', 'arr-q-ph-window-fails', 'arr-q-ph-longest', 'arr-q-ph-first-vs-last', 'arr-q-ph-mod', 'arr-q-ph-xor', 'arr-q-ph-product', 'arr-q-ph-match', 'arr-q-ph-fill'] },
  ],
}

export const range2d: Page = {
  id: 'range-2d',
  title: 'Difference arrays in depth, and 2D prefix sums',
  summary: 'Why difference arrays work (a telescoping proof), the sweep-line view of intervals, rectangle sums by inclusion–exclusion, and 2D range updates with four corner marks.',
  minutes: 18,
  blocks: [
    {
      t: 'md',
      md: `
        Prefix sums and difference arrays are **inverses** of each other, like integration and differentiation. Once you see that, both the 1D tricks and their 2D versions follow from one picture.

        ## The 1D pair

        - The **prefix** array of $a$: $P[i] = a[0] + \\cdots + a[i-1]$.
        - The **difference** array of $a$: $D[0] = a[0]$, $D[i] = a[i] - a[i-1]$.

        Taking the prefix sums of $D$ gives back $a$, because the sum **telescopes**:

        $$D[0] + D[1] + \\cdots + D[i] = a[0] + (a[1] - a[0]) + \\cdots + (a[i] - a[i-1]) = a[i].$$

        **Range update.** Adding $v$ to every element of $a[l..r]$ changes only *two* differences: $D[l]$ grows by $v$ (the step up into the range) and $D[r+1]$ shrinks by $v$ (the step back down). Every difference strictly inside the range is unchanged — neighbours moved together. So each update is $O(1)$, and one $O(n)$ prefix pass at the end applies all of them.

        **When to use it:** many range *updates*, then reads at the end (offline). If reads and updates interleave, you need a Fenwick tree or segment tree (later chapters).
      `,
    },
    {
      t: 'md',
      md: `
        ## The sweep-line view: counting overlaps

        A list of intervals \`[start, end]\` is a stream of range updates with $v = 1$. Mark $+1$ at each start and $-1$ just after each end; a running sum then tells **how many intervals cover each point**. Its maximum is the **maximum overlap** — the minimum number of meeting rooms, train platforms or machines needed.

        When coordinates are huge (times up to $10^9$), you cannot allocate $D$ of that size. Instead keep only the **events**: sort the $2m$ points \`(time, +1)\` and \`(time, −1)\` and sweep through them. That is the same difference array, stored sparsely — and the bridge to the Intervals page and to coordinate compression.

        | problem in disguise | update | read |
        |---|---|---|
        | car pooling: can the car carry everyone? | $+$passengers on [from, to) | max of running sum ≤ capacity |
        | flight bookings: seats per flight | $+$seats on [first, last] | the running sum itself |
        | most popular time / max overlapping events | $+1$ on [s, e] | max of running sum |
        | painting a fence k times | $+1$ on [l, r] per stroke | count of positions ≥ k |
      `,
    },
    {
      t: 'code',
      title: 'Car pooling with a difference array (stops in 0…1000)',
      code: {
        cpp: `bool carPooling(const vector<array<int,3>>& trips, int capacity) {
    vector<int> D(1002, 0);
    for (auto [num, from, to] : trips) { D[from] += num; D[to] -= num; }   // riders on [from, to)
    int load = 0;
    for (int x = 0; x <= 1000; x++) {
        load += D[x];
        if (load > capacity) return false;
    }
    return true;
}`,
        java: `static boolean carPooling(int[][] trips, int capacity) {
    int[] D = new int[1002];
    for (int[] t : trips) { D[t[1]] += t[0]; D[t[2]] -= t[0]; }
    int load = 0;
    for (int x = 0; x <= 1000; x++) {
        load += D[x];
        if (load > capacity) return false;
    }
    return true;
}`,
        python: `def car_pooling(trips, capacity):
    D = [0] * 1002
    for num, frm, to in trips:
        D[frm] += num
        D[to] -= num                    # they leave at 'to', so [from, to)
    load = 0
    for x in range(1001):
        load += D[x]
        if load > capacity:
            return False
    return True`,
        js: `function carPooling(trips, capacity) {
  const D = new Array(1002).fill(0);
  for (const [num, from, to] of trips) { D[from] += num; D[to] -= num; }
  let load = 0;
  for (let x = 0; x <= 1000; x++) {
    load += D[x];
    if (load > capacity) return false;
  }
  return true;
}`,
        c: `int car_pooling(int trips[][3], int m, int capacity) {
    int D[1002] = {0};
    for (int i = 0; i < m; i++) { D[trips[i][1]] += trips[i][0]; D[trips[i][2]] -= trips[i][0]; }
    int load = 0;
    for (int x = 0; x <= 1000; x++) {
        load += D[x];
        if (load > capacity) return 0;
    }
    return 1;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## 2D prefix sums

        > Given an $R \\times C$ grid and many queries "sum of the rectangle with corners $(r_1, c_1)$ and $(r_2, c_2)$", answer each in $O(1)$.

        Define $P[r][c]$ = sum of all cells $(i, j)$ with $i < r$ and $j < c$ — the block above and to the left, with an extra zero row and column so that $P[0][\\cdot] = P[\\cdot][0] = 0$.

        **Building it (inclusion–exclusion).** The block for $P[r+1][c+1]$ is the cell $M[r][c]$, plus the block above it ($P[r][c+1]$), plus the block to its left ($P[r+1][c]$). But the corner block $P[r][c]$ lies inside *both* of those, so it was added twice — subtract it once:

        $$P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c].$$

        **Querying.** The rectangle $(r_1..r_2) \\times (c_1..c_2)$ is the big block up to $(r_2, c_2)$, minus the strip above row $r_1$, minus the strip left of column $c_1$, plus the corner removed twice:

        $$S = P[r_2+1][c_2+1] - P[r_1][c_2+1] - P[r_2+1][c_1] + P[r_1][c_1].$$

        The pattern "add, subtract the overlaps, add back what was subtracted twice" is the **inclusion–exclusion principle** for two sets: $|A \\cup B| = |A| + |B| - |A \\cap B|$.
      `,
    },
    { t: 'viz', algo: 'arr-prefix-2d', caption: 'Each P cell takes two "+" arrows and one "−" arrow. In the last frame, the green corners are added and the red corners subtracted.' },
    {
      t: 'code',
      title: '2D prefix sums: build in O(RC), query in O(1)',
      code: {
        cpp: `struct Prefix2D {
    vector<vector<long long>> P;
    Prefix2D(const vector<vector<int>>& M) {
        int R = M.size(), C = M[0].size();
        P.assign(R + 1, vector<long long>(C + 1, 0));
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c];
    }
    long long sum(int r1, int c1, int r2, int c2) const {     // inclusive
        return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];
    }
};`,
        java: `class Prefix2D {
    final long[][] P;
    Prefix2D(int[][] M) {
        int R = M.length, C = M[0].length;
        P = new long[R + 1][C + 1];
        for (int r = 0; r < R; r++)
            for (int c = 0; c < C; c++)
                P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c];
    }
    long sum(int r1, int c1, int r2, int c2) {
        return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];
    }
}`,
        python: `class Prefix2D:
    def __init__(self, M):
        R, C = len(M), len(M[0])
        P = [[0] * (C + 1) for _ in range(R + 1)]
        for r in range(R):
            row, up, cur = M[r], P[r], P[r + 1]
            for c in range(C):
                cur[c + 1] = row[c] + up[c + 1] + cur[c] - up[c]
        self.P = P

    def sum(self, r1, c1, r2, c2):
        P = self.P
        return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]`,
        js: `class Prefix2D {
  constructor(M) {
    const R = M.length, C = M[0].length;
    this.P = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
    const P = this.P;
    for (let r = 0; r < R; r++)
      for (let c = 0; c < C; c++)
        P[r + 1][c + 1] = M[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c];
  }
  sum(r1, c1, r2, c2) {
    const P = this.P;
    return P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1];
  }
}`,
        c: `#define MAXN 1001
static long long P[MAXN + 1][MAXN + 1];
void build(int R, int C, int M[][MAXN]) {
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            P[r+1][c+1] = M[r][c] + P[r][c+1] + P[r+1][c] - P[r][c];
}
long long rect_sum(int r1, int c1, int r2, int c2) {
    return P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1];
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## 2D difference arrays

        Now the reverse: **many "add $v$ to every cell of a rectangle" updates**, then read the whole grid. Mark four corners in $D$:

        | cell | change | why |
        |---|---|---|
        | $(r_1, c_1)$ | $+v$ | after a 2D prefix sum, this spreads $+v$ to everything down-right of it |
        | $(r_1, c_2+1)$ | $-v$ | stops it spreading past the right edge |
        | $(r_2+1, c_1)$ | $-v$ | stops it spreading past the bottom edge |
        | $(r_2+1, c_2+1)$ | $+v$ | the region down-right of both edges was cancelled twice — restore it |

        A 2D prefix sum of $D$ at the end gives each cell the total of the corner marks above-left of it, which is exactly $v$ for cells inside the rectangle and $0$ outside — summed over all updates.
      `,
    },
    { t: 'viz', algo: 'arr-diff-2d', caption: 'Each update writes only four cells of D (green +v, red −v) however big the rectangle. The final sweep fills A using the same inclusion–exclusion arrows as the 2D prefix sum.' },
    {
      t: 'code',
      title: 'Rectangle additions with a 2D difference array',
      code: {
        cpp: `vector<vector<long long>> applyUpdates(int R, int C, const vector<array<long long,5>>& ups) {
    vector<vector<long long>> D(R + 1, vector<long long>(C + 1, 0));
    for (auto [r1, c1, r2, c2, v] : ups) {
        D[r1][c1] += v; D[r1][c2+1] -= v; D[r2+1][c1] -= v; D[r2+1][c2+1] += v;
    }
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            D[r][c] += (r ? D[r-1][c] : 0) + (c ? D[r][c-1] : 0) - (r && c ? D[r-1][c-1] : 0);
    D.pop_back();
    for (auto& row : D) row.pop_back();
    return D;
}`,
        java: `static long[][] applyUpdates(int R, int C, long[][] ups) {
    long[][] D = new long[R + 1][C + 1];
    for (long[] u : ups) {
        int r1 = (int) u[0], c1 = (int) u[1], r2 = (int) u[2], c2 = (int) u[3]; long v = u[4];
        D[r1][c1] += v; D[r1][c2+1] -= v; D[r2+1][c1] -= v; D[r2+1][c2+1] += v;
    }
    long[][] A = new long[R][C];
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            A[r][c] = D[r][c] + (r > 0 ? A[r-1][c] : 0) + (c > 0 ? A[r][c-1] : 0) - (r > 0 && c > 0 ? A[r-1][c-1] : 0);
    return A;
}`,
        python: `def apply_updates(R, C, ups):
    D = [[0] * (C + 1) for _ in range(R + 1)]
    for r1, c1, r2, c2, v in ups:
        D[r1][c1] += v
        D[r1][c2 + 1] -= v
        D[r2 + 1][c1] -= v
        D[r2 + 1][c2 + 1] += v
    A = [[0] * C for _ in range(R)]
    for r in range(R):
        for c in range(C):
            A[r][c] = D[r][c] + (A[r-1][c] if r else 0) + (A[r][c-1] if c else 0) - (A[r-1][c-1] if r and c else 0)
    return A`,
        js: `function applyUpdates(R, C, ups) {
  const D = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
  for (const [r1, c1, r2, c2, v] of ups) {
    D[r1][c1] += v; D[r1][c2 + 1] -= v; D[r2 + 1][c1] -= v; D[r2 + 1][c2 + 1] += v;
  }
  const A = Array.from({ length: R }, () => new Array(C).fill(0));
  for (let r = 0; r < R; r++)
    for (let c = 0; c < C; c++)
      A[r][c] = D[r][c] + (r ? A[r - 1][c] : 0) + (c ? A[r][c - 1] : 0) - (r && c ? A[r - 1][c - 1] : 0);
  return A;
}`,
        c: `static long long D[MAXN + 1][MAXN + 1];
void add_rect(int r1, int c1, int r2, int c2, long long v) {
    D[r1][c1] += v; D[r1][c2+1] -= v; D[r2+1][c1] -= v; D[r2+1][c2+1] += v;
}
void finalize(int R, int C) {       /* D[r][c] becomes the value of cell (r, c) */
    for (int r = 0; r < R; r++)
        for (int c = 0; c < C; c++)
            D[r][c] += (r ? D[r-1][c] : 0) + (c ? D[r][c-1] : 0) - (r && c ? D[r-1][c-1] : 0);
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Off-by-one in two dimensions',
      md: `- Allocate $D$ as $(R + 1) \\times (C + 1)$ so the $-v$ marks at row $r_2 + 1$ and column $c_2 + 1$ have somewhere to go.
- In $P$ the shift is the other way: $P[r][c]$ covers rows $< r$, so the query uses $r_2 + 1$ and $c_2 + 1$ but plain $r_1$ and $c_1$.
- Inclusive vs exclusive corners: write down which one your problem uses before writing the formula. Most bugs are a single missing \`+ 1\`.
- Use 64-bit sums: a $1000 \\times 1000$ grid of values up to $10^9$ sums to $10^{15}$.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Where it appears',
      md: `"Range Sum Query 2D – Immutable" is the canonical question; follow-ups include "count submatrices with sum k" (fix two rows, collapse columns into a 1D array, then use the prefix-hash trick: $O(R^2 C)$), "largest square of 1s whose sum ≤ threshold" (2D prefix + binary search), and image processing tasks like box blur. Range-addition problems ("stamping", "flip rectangles", "count cells covered at least k times") are 2D difference arrays.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: '1D difference array: m updates + final pass', time: 'O(m + n)', space: 'O(n)' },
        { op: 'Max overlap of m intervals (sparse sweep)', time: 'O(m log m)', space: 'O(m)', note: 'sort the 2m events' },
        { op: 'Build 2D prefix sums', time: 'O(RC)', space: 'O(RC)' },
        { op: 'Rectangle sum query', time: 'O(1)' },
        { op: '2D difference: m updates + final pass', time: 'O(m + RC)', space: 'O(RC)' },
        { op: 'Count submatrices with sum k', time: 'O(R²C)', note: 'fix two rows, 1D prefix-hash on columns' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-r2-telescope', 'arr-q-r2-diff-trace', 'arr-q-r2-build', 'arr-q-r2-query', 'arr-q-r2-corners', 'arr-q-r2-overlap', 'arr-q-r2-online', 'arr-q-r2-order'] },
  ],
}
