import type { Page } from '../../../types'

export const kadaneVariants: Page = {
  id: 'kadane-variants',
  title: 'Kadane variants: products, circular arrays, one deletion, and 2D',
  summary: 'The "best ending here" idea stretched in every direction interviews take it — maximum product, circular maximum, at most one deletion, minimum and absolute sums, length constraints, and the maximum-sum rectangle.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        Kadane's algorithm is one sentence of dynamic programming: **the best subarray ending at $i$ either is $a[i]$ alone or extends the best subarray ending at $i - 1$.** Every variant on this page keeps that shape and changes only *what state* must be remembered about "subarrays ending here". Ask yourself each time: *is one number enough to summarise the past, or do I need two?*

        ## Maximum product subarray

        > The contiguous subarray with the largest **product**. \`[2, 3, −2, 4]\` → 6; \`[−2, 3, −4]\` → 24.

        One number is not enough. A very **negative** product ending at $i - 1$ becomes the very **largest** product as soon as another negative arrives. So keep both:

        $$\\text{hi}_i = \\max(a_i,\\ \\text{hi}_{i-1} a_i,\\ \\text{lo}_{i-1} a_i), \\qquad \\text{lo}_i = \\min(a_i,\\ \\text{hi}_{i-1} a_i,\\ \\text{lo}_{i-1} a_i).$$

        **Why these three candidates are enough.** Any subarray ending at $i$ is either $[a_i]$ or (a subarray ending at $i - 1$) × $a_i$. Multiplying by $a_i \\ge 0$ preserves order, so the extremes come from the previous extremes; multiplying by $a_i < 0$ reverses order, so the new maximum comes from the old *minimum* and vice versa. The code shortcut "swap hi and lo when $a_i < 0$" is exactly this. A zero resets both to 0, which naturally starts a fresh product afterwards.
      `,
    },
    { t: 'viz', algo: 'arr-max-product', caption: 'The two-row table is the whole DP. Watch the swap frame at each negative: the minimum row feeds the maximum row.' },
    {
      t: 'md',
      md: `
        ## Maximum circular subarray

        > The array is circular — the end wraps to the start. Find the maximum subarray sum. \`[5, −3, 5]\` → 10 (\`5, 5\` wrapping).

        A circular subarray either **does not wrap** (ordinary Kadane) or **wraps**. A wrapping subarray is everything *except* a contiguous block in the middle. So

        $$\\text{best wrap} = \\text{total} - (\\text{minimum subarray sum}),$$

        and the minimum subarray sum is Kadane with \`min\`. Answer: $\\max(\\text{Kadane}_{\\max}, \\text{total} - \\text{Kadane}_{\\min})$.

        **The trap.** If every element is negative, the minimum subarray is the whole array and $\\text{total} - \\min = 0$ — the *empty* subarray, which is not allowed. Detect it with $\\text{Kadane}_{\\max} < 0$ and return $\\text{Kadane}_{\\max}$.
      `,
    },
    { t: 'viz', algo: 'arr-circular-kadane', caption: 'The red band is the worst contiguous middle; leaving it out gives the green wrap-around answer.' },
    {
      t: 'md',
      md: `
        ## Maximum subarray sum with at most one deletion

        > You may delete at most one element from the chosen subarray (it must stay non-empty). \`[1, −2, 0, 3]\` → 4 (delete −2).

        Now the state is "subarrays ending at $i$" split by **whether a deletion has been used**:

        - $\\text{keep}_i$ — best sum ending at $i$, nothing deleted: plain Kadane.
        - $\\text{del}_i$ — best sum ending at $i$ with exactly one element deleted: either we delete $a_i$ itself (then the rest is $\\text{keep}_{i-1}$), or the deletion happened earlier and we extend: $\\text{del}_{i-1} + a_i$.

        $$\\text{del}_i = \\max(\\text{keep}_{i-1},\\ \\text{del}_{i-1} + a_i), \\qquad \\text{keep}_i = \\max(a_i,\\ \\text{keep}_{i-1} + a_i).$$

        Answer: the maximum of every $\\text{keep}_i$ and $\\text{del}_i$. Order of updates matters in code — compute \`del\` from the **old** \`keep\`.
      `,
    },
    { t: 'viz', algo: 'arr-one-deletion', caption: 'A two-row DP table with its dependency arrows. "skip" arrows are the moment an element is deleted.' },
    {
      t: 'code',
      title: 'The three variants side by side',
      code: {
        cpp: `long long maxProduct(const vector<int>& a) {
    long long hi = a[0], lo = a[0], best = a[0];
    for (size_t i = 1; i < a.size(); i++) {
        long long x = a[i];
        if (x < 0) swap(hi, lo);
        hi = max(x, hi * x); lo = min(x, lo * x);
        best = max(best, hi);
    }
    return best;
}
long long maxCircular(const vector<int>& a) {
    long long total = 0, cmax = 0, bmax = LLONG_MIN, cmin = 0, bmin = LLONG_MAX;
    for (int x : a) {
        cmax = max<long long>(x, cmax + x); bmax = max(bmax, cmax);
        cmin = min<long long>(x, cmin + x); bmin = min(bmin, cmin);
        total += x;
    }
    return bmax < 0 ? bmax : max(bmax, total - bmin);
}
long long maxOneDeletion(const vector<int>& a) {
    long long keep = a[0], del = LLONG_MIN / 4, best = a[0];
    for (size_t i = 1; i < a.size(); i++) {
        del = max(keep, del + a[i]);
        keep = max<long long>(a[i], keep + a[i]);
        best = max({best, keep, del});
    }
    return best;
}`,
        java: `static long maxProduct(int[] a) {
    long hi = a[0], lo = a[0], best = a[0];
    for (int i = 1; i < a.length; i++) {
        long x = a[i];
        if (x < 0) { long t = hi; hi = lo; lo = t; }
        hi = Math.max(x, hi * x); lo = Math.min(x, lo * x);
        best = Math.max(best, hi);
    }
    return best;
}
static long maxCircular(int[] a) {
    long total = 0, cmax = 0, bmax = Long.MIN_VALUE, cmin = 0, bmin = Long.MAX_VALUE;
    for (int x : a) {
        cmax = Math.max(x, cmax + x); bmax = Math.max(bmax, cmax);
        cmin = Math.min(x, cmin + x); bmin = Math.min(bmin, cmin);
        total += x;
    }
    return bmax < 0 ? bmax : Math.max(bmax, total - bmin);
}
static long maxOneDeletion(int[] a) {
    long keep = a[0], del = Long.MIN_VALUE / 4, best = a[0];
    for (int i = 1; i < a.length; i++) {
        del = Math.max(keep, del + a[i]);
        keep = Math.max(a[i], keep + a[i]);
        best = Math.max(best, Math.max(keep, del));
    }
    return best;
}`,
        python: `def max_product(a):
    hi = lo = best = a[0]
    for x in a[1:]:
        if x < 0:
            hi, lo = lo, hi
        hi, lo = max(x, hi * x), min(x, lo * x)
        best = max(best, hi)
    return best

def max_circular(a):
    total, cmax, cmin = 0, 0, 0
    bmax, bmin = float('-inf'), float('inf')
    for x in a:
        cmax = max(x, cmax + x); bmax = max(bmax, cmax)
        cmin = min(x, cmin + x); bmin = min(bmin, cmin)
        total += x
    return bmax if bmax < 0 else max(bmax, total - bmin)

def max_one_deletion(a):
    keep, dele, best = a[0], float('-inf'), a[0]
    for x in a[1:]:
        dele = max(keep, dele + x)
        keep = max(x, keep + x)
        best = max(best, keep, dele)
    return best`,
        js: `function maxProduct(a) {
  let hi = a[0], lo = a[0], best = a[0];
  for (let i = 1; i < a.length; i++) {
    const x = a[i];
    if (x < 0) [hi, lo] = [lo, hi];
    hi = Math.max(x, hi * x); lo = Math.min(x, lo * x);
    best = Math.max(best, hi);
  }
  return best;
}
function maxCircular(a) {
  let total = 0, cmax = 0, bmax = -Infinity, cmin = 0, bmin = Infinity;
  for (const x of a) {
    cmax = Math.max(x, cmax + x); bmax = Math.max(bmax, cmax);
    cmin = Math.min(x, cmin + x); bmin = Math.min(bmin, cmin);
    total += x;
  }
  return bmax < 0 ? bmax : Math.max(bmax, total - bmin);
}
function maxOneDeletion(a) {
  let keep = a[0], del = -Infinity, best = a[0];
  for (let i = 1; i < a.length; i++) {
    del = Math.max(keep, del + a[i]);
    keep = Math.max(a[i], keep + a[i]);
    best = Math.max(best, keep, del);
  }
  return best;
}`,
        c: `long long max_product(const int *a, int n) {
    long long hi = a[0], lo = a[0], best = a[0];
    for (int i = 1; i < n; i++) {
        long long x = a[i];
        if (x < 0) { long long t = hi; hi = lo; lo = t; }
        hi = x > hi * x ? x : hi * x;
        lo = x < lo * x ? x : lo * x;
        if (hi > best) best = hi;
    }
    return best;
}
long long max_circular(const int *a, int n) {
    long long total = 0, cmax = 0, bmax = LLONG_MIN, cmin = 0, bmin = LLONG_MAX;
    for (int i = 0; i < n; i++) {
        long long x = a[i];
        cmax = cmax + x > x ? cmax + x : x; if (cmax > bmax) bmax = cmax;
        cmin = cmin + x < x ? cmin + x : x; if (cmin < bmin) bmin = cmin;
        total += x;
    }
    if (bmax < 0) return bmax;
    return bmax > total - bmin ? bmax : total - bmin;
}
long long max_one_deletion(const int *a, int n) {
    long long keep = a[0], del = LLONG_MIN / 4, best = a[0];
    for (int i = 1; i < n; i++) {
        long long d = del + a[i];
        del = keep > d ? keep : d;
        keep = a[i] > keep + a[i] ? a[i] : keep + a[i];
        if (keep > best) best = keep;
        if (del > best) best = del;
    }
    return best;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## More shapes of the same idea

        | variant | state per index | note |
        |---|---|---|
        | minimum subarray sum | min ending here | Kadane with \`min\` |
        | maximum **absolute** subarray sum | max and min ending here | answer $\\max(\\text{best}_{\\max}, -\\text{best}_{\\min})$ — or $\\max P - \\min P$ over prefixes |
        | best stock profit (one trade) | min price so far | Kadane on day-to-day differences |
        | max sum with length $\\ge k$ | prefix sums | $\\max_r (P[r] - \\min_{l \\le r-k} P[l])$, one pass |
        | max sum with length $\\le k$ | prefix sums + sliding-window minimum | monotonic deque over $P$ |
        | maximum-sum rectangle (2D) | — | fix top and bottom rows, collapse columns, run Kadane |

        ### Maximum-sum rectangle in a matrix

        For every pair of rows $top \\le bottom$, let $col[c]$ = the sum of column $c$ between those rows (update it incrementally as \`bottom\` grows). A rectangle spanning exactly these rows is a contiguous range of columns, so its best sum is **Kadane on \`col\`**. There are $O(R^2)$ row pairs, each $O(C)$: total $O(R^2 C)$ — versus $O(R^2 C^2)$ with 2D prefix sums alone.
      `,
    },
    {
      t: 'code',
      title: 'Maximum-sum rectangle: Kadane over collapsed columns',
      code: {
        cpp: `long long maxRectangle(const vector<vector<int>>& M) {
    int R = M.size(), C = M[0].size();
    long long best = LLONG_MIN;
    for (int top = 0; top < R; top++) {
        vector<long long> col(C, 0);
        for (int bottom = top; bottom < R; bottom++) {
            for (int c = 0; c < C; c++) col[c] += M[bottom][c];
            long long cur = 0;                      // Kadane on col
            for (int c = 0; c < C; c++) {
                cur = max(col[c], cur + col[c]);
                best = max(best, cur);
            }
        }
    }
    return best;
}`,
        java: `static long maxRectangle(int[][] M) {
    int R = M.length, C = M[0].length;
    long best = Long.MIN_VALUE;
    for (int top = 0; top < R; top++) {
        long[] col = new long[C];
        for (int bottom = top; bottom < R; bottom++) {
            for (int c = 0; c < C; c++) col[c] += M[bottom][c];
            long cur = 0;
            for (int c = 0; c < C; c++) {
                cur = Math.max(col[c], cur + col[c]);
                best = Math.max(best, cur);
            }
        }
    }
    return best;
}`,
        python: `def max_rectangle(M):
    R, C = len(M), len(M[0])
    best = float('-inf')
    for top in range(R):
        col = [0] * C
        for bottom in range(top, R):
            row = M[bottom]
            cur = 0
            for c in range(C):
                col[c] += row[c]
                cur = max(col[c], cur + col[c])
                best = max(best, cur)
    return best`,
        js: `function maxRectangle(M) {
  const R = M.length, C = M[0].length;
  let best = -Infinity;
  for (let top = 0; top < R; top++) {
    const col = new Array(C).fill(0);
    for (let bottom = top; bottom < R; bottom++) {
      let cur = 0;
      for (let c = 0; c < C; c++) {
        col[c] += M[bottom][c];
        cur = Math.max(col[c], cur + col[c]);
        best = Math.max(best, cur);
      }
    }
  }
  return best;
}`,
        c: `long long max_rectangle(int R, int C, int M[R][C]) {
    long long best = LLONG_MIN, col[C];
    for (int top = 0; top < R; top++) {
        for (int c = 0; c < C; c++) col[c] = 0;
        for (int bottom = top; bottom < R; bottom++) {
            long long cur = 0;
            for (int c = 0; c < C; c++) {
                col[c] += M[bottom][c];
                cur = col[c] > cur + col[c] ? col[c] : cur + col[c];
                if (cur > best) best = cur;
            }
        }
    }
    return best;
}`,
      },
      note: 'If R > C, transpose first so the quadratic factor applies to the smaller dimension: O(min(R,C)² · max(R,C)).',
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Variant-specific traps',
      md: `- **Product**: initialise from \`a[0]\`, not 1 or 0 (\`[-2]\` → −2). Products overflow fast; problems usually promise the answer fits in 32 or 64 bits — intermediate \`lo\` values may not, so use 64-bit.
- **Circular**: the all-negative case. Also, a wrapping answer must leave out a *non-empty* middle — guaranteed whenever $\\text{Kadane}_{\\max} \\ge 0$.
- **One deletion**: you may not delete the only element; \`del\` starts at $-\\infty$, not 0.
- **Every variant**: decide whether the empty subarray is allowed. It changes the initial values.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'The question behind the question',
      md: `Interviewers use these variants to see whether you *understand* Kadane or memorised it. The winning move is to say the DP state out loud — "best product ending here needs both the max and the min, because a negative swaps them" — and derive the recurrence from "a subarray ending at $i$ is $a_i$ alone or extends one ending at $i - 1$". Then complexity is obvious: $O(n)$ time, $O(1)$ space.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Maximum product subarray', time: 'O(n)', space: 'O(1)' },
        { op: 'Maximum circular subarray', time: 'O(n)', space: 'O(1)' },
        { op: 'Max sum with ≤ 1 deletion', time: 'O(n)', space: 'O(1)' },
        { op: 'Max sum with length ≥ k', time: 'O(n)', space: 'O(n) or O(1)' },
        { op: 'Maximum-sum rectangle', time: 'O(R²C)', space: 'O(C)' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-kv-product', 'arr-q-kv-why-min', 'arr-q-kv-circular', 'arr-q-kv-allneg', 'arr-q-kv-deletion', 'arr-q-kv-order', 'arr-q-kv-rect', 'arr-q-kv-abs'] },
  ],
}

export const majorityVote: Page = {
  id: 'majority-vote',
  title: 'Majority vote: Boyer–Moore and its n/k generalisation',
  summary: 'Why cancelling pairs finds a majority, a full proof, the two-candidate version for n/3, the k−1 counter version (Misra–Gries) for n/k, and when to prefer hashing or sorting.',
  minutes: 15,
  blocks: [
    {
      t: 'md',
      md: `
        > **Majority element**: the value occurring **more than $n/2$** times (if any). Find it in $O(n)$ time and $O(1)$ space.

        A hash map counts in $O(n)$ space. Sorting puts the majority at index $\\lfloor n/2 \\rfloor$ (it covers more than half the positions, so it must cover the middle one) — $O(n \\log n)$. **Boyer–Moore voting** needs two variables.

        ## The algorithm

        Keep a \`candidate\` and a \`count\`. For each $x$: if \`count = 0\`, adopt $x$ as candidate with count 1; else if $x$ = candidate, \`count++\`; else \`count−−\`. Finally, verify the candidate with a second counting pass.

        ## Proof by pairing

        Think of every \`count−−\` as **discarding a pair of two different values**: the current $x$ and one stored copy of the candidate. Everything that is discarded comes in pairs of *different* values.

        Suppose $m$ occurs more than $n/2$ times. Each discarded pair contains **at most one** copy of $m$, and there are at most $n/2$ pairs, so at most $\\lfloor n/2 \\rfloor$ copies of $m$ are discarded — fewer than its total. Hence some copies of $m$ survive undiscarded. The undiscarded elements are exactly the \`count\` copies of the final candidate (all equal), so the final candidate is $m$. ∎

        Without a majority the survivor is arbitrary — hence the **verification pass**.
      `,
    },
    { t: 'viz', algo: 'arr-majority', caption: 'The stack holds the candidate’s undiscarded votes. Each different value pops one — a discarded pair.' },
    {
      t: 'md',
      md: `
        ## Generalising: everything above n/3

        > Return all values occurring **more than $\\lfloor n/3 \\rfloor$** times.

        **At most two values can qualify:** three of them would need more than $3 \\cdot n/3 = n$ elements. So keep **two** candidates with two counters, and discard **triples of three different values**:

        - $x$ matches candidate 1 or 2 → increment that counter;
        - else if a counter is 0 → $x$ takes over that slot;
        - else → decrement **both** counters (discard $x$ and one copy of each candidate).

        **Proof.** Each discard removes three *different* values, so at most $n/3$ discards happen, each removing at most one copy of any value $m$. A value with more than $n/3$ copies cannot lose them all, so it ends as one of the two candidates. Again, candidates must be verified.
      `,
    },
    { t: 'viz', algo: 'arr-majority-n3', caption: 'Two vote stacks. A third, different value cancels one vote from each — a discarded triple.' },
    {
      t: 'md',
      md: `
        ## Any k: the Misra–Gries summary

        For "more than $n/k$ times", keep up to $k - 1$ (value, count) pairs. On $x$: increment its counter if present; else insert it if fewer than $k - 1$ are stored; else decrement **every** counter and drop those reaching zero (discarding $k$ different values). At most $n/k$ discards happen, so every value above $n/k$ survives. With a hash map for the counters, the cost is $O(n)$ amortized — each decrement-all step can be charged to the $k$ increments it cancels.

        This is the classic **heavy hitters** streaming algorithm: it finds frequent items in a data stream using memory independent of the stream's length.
      `,
    },
    {
      t: 'code',
      title: 'Majority (> n/2) and all elements > n/3',
      code: {
        cpp: `int majority(const vector<int>& a) {            // returns -1 if none (values >= 0)
    int cand = 0, cnt = 0;
    for (int x : a) {
        if (cnt == 0) { cand = x; cnt = 1; }
        else if (x == cand) cnt++;
        else cnt--;
    }
    return count(a.begin(), a.end(), cand) * 2 > (long long)a.size() ? cand : -1;
}
vector<int> majorityThird(const vector<int>& a) {
    int c1 = 0, c2 = 1, n1 = 0, n2 = 0;
    for (int x : a) {
        if (x == c1) n1++;
        else if (x == c2) n2++;
        else if (n1 == 0) { c1 = x; n1 = 1; }
        else if (n2 == 0) { c2 = x; n2 = 1; }
        else { n1--; n2--; }
    }
    vector<int> out;
    for (int c : {c1, c2})
        if (count(a.begin(), a.end(), c) * 3 > (long long)a.size() && find(out.begin(), out.end(), c) == out.end())
            out.push_back(c);
    sort(out.begin(), out.end());
    return out;
}`,
        java: `static int majority(int[] a) {
    int cand = 0, cnt = 0;
    for (int x : a) {
        if (cnt == 0) { cand = x; cnt = 1; }
        else if (x == cand) cnt++;
        else cnt--;
    }
    int c = 0; for (int x : a) if (x == cand) c++;
    return 2L * c > a.length ? cand : -1;
}
static List<Integer> majorityThird(int[] a) {
    int c1 = 0, c2 = 1, n1 = 0, n2 = 0;
    for (int x : a) {
        if (x == c1) n1++;
        else if (x == c2) n2++;
        else if (n1 == 0) { c1 = x; n1 = 1; }
        else if (n2 == 0) { c2 = x; n2 = 1; }
        else { n1--; n2--; }
    }
    List<Integer> out = new ArrayList<>();
    for (int c : new int[]{c1, c2}) {
        int cnt = 0; for (int x : a) if (x == c) cnt++;
        if (3L * cnt > a.length && !out.contains(c)) out.add(c);
    }
    Collections.sort(out);
    return out;
}`,
        python: `def majority(a):
    cand, cnt = None, 0
    for x in a:
        if cnt == 0:
            cand, cnt = x, 1
        elif x == cand:
            cnt += 1
        else:
            cnt -= 1
    return cand if a.count(cand) * 2 > len(a) else None

def majority_third(a):
    c1, c2, n1, n2 = None, None, 0, 0
    for x in a:
        if x == c1: n1 += 1
        elif x == c2: n2 += 1
        elif n1 == 0: c1, n1 = x, 1
        elif n2 == 0: c2, n2 = x, 1
        else: n1 -= 1; n2 -= 1
    return sorted({c for c in (c1, c2) if c is not None and a.count(c) * 3 > len(a)})`,
        js: `function majority(a) {
  let cand = null, cnt = 0;
  for (const x of a) {
    if (cnt === 0) { cand = x; cnt = 1; }
    else if (x === cand) cnt++;
    else cnt--;
  }
  return a.filter((x) => x === cand).length * 2 > a.length ? cand : null;
}
function majorityThird(a) {
  let c1 = null, c2 = null, n1 = 0, n2 = 0;
  for (const x of a) {
    if (x === c1) n1++;
    else if (x === c2) n2++;
    else if (n1 === 0) { c1 = x; n1 = 1; }
    else if (n2 === 0) { c2 = x; n2 = 1; }
    else { n1--; n2--; }
  }
  return [...new Set([c1, c2])]
    .filter((c) => c !== null && a.filter((x) => x === c).length * 3 > a.length)
    .sort((x, y) => x - y);
}`,
        c: `int majority(const int *a, int n, int *out) {      /* returns 1 and sets *out if found */
    int cand = 0, cnt = 0;
    for (int i = 0; i < n; i++) {
        if (cnt == 0) { cand = a[i]; cnt = 1; }
        else if (a[i] == cand) cnt++;
        else cnt--;
    }
    int c = 0; for (int i = 0; i < n; i++) c += a[i] == cand;
    if (2LL * c > n) { *out = cand; return 1; }
    return 0;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Skipping verification',
      md: `On \`[1, 2, 3]\` Boyer–Moore ends with candidate 3 — which is not a majority. Unless the problem **guarantees** a majority exists, always run the counting pass. In the $n/3$ version, also guard against both candidates being the same value (initialise \`c1\` and \`c2\` to different values, or de-duplicate the output) and against reporting a candidate whose slot was never filled.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Typical follow-ups',
      md: `"Majority element" → "now O(1) space" (Boyer–Moore) → "now more than n/3" (two candidates, prove at most two) → "in a stream / distributed" (Misra–Gries summaries can be **merged**). Also: "majority in a sorted array in O(log n)" — check \`a[n/2]\` and binary-search its first and last occurrence.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Hash-map counting', time: 'O(n) expected', space: 'O(distinct)' },
        { op: 'Sort, take a[n/2], verify', time: 'O(n log n)', space: 'O(1)–O(n)' },
        { op: 'Boyer–Moore (> n/2)', time: 'O(n)', space: 'O(1)', note: 'two passes with verification' },
        { op: 'Two candidates (> n/3)', time: 'O(n)', space: 'O(1)' },
        { op: 'Misra–Gries (> n/k)', time: 'O(n) amortized', space: 'O(k)' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-mv-proof', 'arr-q-mv-false', 'arr-q-mv-how-many', 'arr-q-mv-trace', 'arr-q-mv-k', 'arr-q-mv-sorted'] },
  ],
}

export const matrixTechniques: Page = {
  id: 'matrix-techniques',
  title: 'Matrix techniques: rotation, spirals, zeroing and searching',
  summary: 'In-place 90° rotation with a proof, spiral traversal and generation, set-matrix-zeroes in O(1) space, staircase and binary search in sorted matrices, diagonals, and in-place state encoding.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        Matrix problems reward one habit above all: **write down where an element at $(r, c)$ must go**, as a formula, before writing loops. The loops then follow from the formula, and the proof of correctness is just checking the formula.

        ## Rotate an N × N matrix 90° clockwise, in place

        Rotating clockwise moves the top row to the right column, the right column to the bottom row, and so on. In coordinates:

        $$(r, c) \\longmapsto (c,\\ N - 1 - r).$$

        Check a corner: $(0, 0) \\mapsto (0, N-1)$ — top-left goes to top-right. ✓

        **Decompose the map into two easy in-place operations:**

        1. **Transpose**: $(r, c) \\mapsto (c, r)$ — swap across the main diagonal.
        2. **Reverse each row**: $(r, c) \\mapsto (r, N - 1 - c)$.

        Composing: $(r, c) \\xrightarrow{\\text{transpose}} (c, r) \\xrightarrow{\\text{reverse}} (c, N - 1 - r)$ — exactly the rotation. Both steps swap pairs of cells, so they need $O(1)$ extra space.

        | rotation | recipe |
        |---|---|
        | 90° clockwise | transpose, then reverse each row |
        | 90° counter-clockwise | transpose, then reverse each column (or reverse rows first, then transpose) |
        | 180° | reverse each row, then reverse the row order |
      `,
    },
    { t: 'viz', algo: 'arr-rotate-matrix', caption: 'Phase 1 swaps across the purple diagonal; phase 2 reverses each row. Follow the value 1: (0,0) → (0,0) → (0,N−1).' },
    {
      t: 'md',
      md: `
        ### The alternative: rotate four cells at a time

        The rotation map has cycles of length 4: $(r, c) \\to (c, N{-}1{-}r) \\to (N{-}1{-}r, N{-}1{-}c) \\to (N{-}1{-}c, r) \\to (r, c)$. Process the matrix ring by ring (layer $r = 0 \\ldots \\lfloor N/2 \\rfloor - 1$, offsets $c = r \\ldots N - 2 - r$) and move the four cells of each cycle with one temporary. It touches each cell once instead of twice, but the transpose-and-reverse version is far easier to get right in an interview.
      `,
    },
    {
      t: 'code',
      title: 'Rotate by layers: one 4-cycle at a time',
      code: {
        cpp: `void rotateLayers(vector<vector<int>>& M) {
    int N = M.size();
    for (int r = 0; r < N / 2; r++)
        for (int c = r; c < N - 1 - r; c++) {
            int tmp = M[r][c];
            M[r][c] = M[N-1-c][r];                 // left column -> top row
            M[N-1-c][r] = M[N-1-r][N-1-c];         // bottom row -> left column
            M[N-1-r][N-1-c] = M[c][N-1-r];         // right column -> bottom row
            M[c][N-1-r] = tmp;                     // top row -> right column
        }
}`,
        java: `static void rotateLayers(int[][] M) {
    int N = M.length;
    for (int r = 0; r < N / 2; r++)
        for (int c = r; c < N - 1 - r; c++) {
            int tmp = M[r][c];
            M[r][c] = M[N-1-c][r];
            M[N-1-c][r] = M[N-1-r][N-1-c];
            M[N-1-r][N-1-c] = M[c][N-1-r];
            M[c][N-1-r] = tmp;
        }
}`,
        python: `def rotate_layers(M):
    N = len(M)
    for r in range(N // 2):
        for c in range(r, N - 1 - r):
            tmp = M[r][c]
            M[r][c] = M[N-1-c][r]
            M[N-1-c][r] = M[N-1-r][N-1-c]
            M[N-1-r][N-1-c] = M[c][N-1-r]
            M[c][N-1-r] = tmp`,
        js: `function rotateLayers(M) {
  const N = M.length;
  for (let r = 0; r < N >> 1; r++)
    for (let c = r; c < N - 1 - r; c++) {
      const tmp = M[r][c];
      M[r][c] = M[N-1-c][r];
      M[N-1-c][r] = M[N-1-r][N-1-c];
      M[N-1-r][N-1-c] = M[c][N-1-r];
      M[c][N-1-r] = tmp;
    }
}`,
        c: `void rotate_layers(int N, int M[N][N]) {
    for (int r = 0; r < N / 2; r++)
        for (int c = r; c < N - 1 - r; c++) {
            int tmp = M[r][c];
            M[r][c] = M[N-1-c][r];
            M[N-1-c][r] = M[N-1-r][N-1-c];
            M[N-1-r][N-1-c] = M[c][N-1-r];
            M[c][N-1-r] = tmp;
        }
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Spirals: reading and writing

        The spiral walk (on the 2D Arrays page) keeps four boundaries — \`top\`, \`bottom\`, \`left\`, \`right\` — and shrinks one after each side is walked. **Spiral matrix II** asks for the reverse: *fill* an $n \\times n$ matrix with $1 \\ldots n^2$ in spiral order. Same four loops, writing a counter instead of reading. For a square matrix the two guards (\`top ≤ bottom\`, \`left ≤ right\`) still matter: with odd $n$ the last ring is a single cell.
      `,
    },
    { t: 'viz', algo: 'arr-spiral', caption: 'The same boundary dance drives spiral reading and spiral writing; only the loop body changes.' },
    {
      t: 'code',
      title: 'Spiral matrix II: generate 1…n² in spiral order',
      code: {
        cpp: `vector<vector<int>> spiralFill(int n) {
    vector<vector<int>> M(n, vector<int>(n));
    int top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) M[top][c] = k++;
        top++;
        for (int r = top; r <= bottom; r++) M[r][right] = k++;
        right--;
        if (top <= bottom) { for (int c = right; c >= left; c--) M[bottom][c] = k++; bottom--; }
        if (left <= right) { for (int r = bottom; r >= top; r--) M[r][left] = k++; left++; }
    }
    return M;
}`,
        java: `static int[][] spiralFill(int n) {
    int[][] M = new int[n][n];
    int top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) M[top][c] = k++;
        top++;
        for (int r = top; r <= bottom; r++) M[r][right] = k++;
        right--;
        if (top <= bottom) { for (int c = right; c >= left; c--) M[bottom][c] = k++; bottom--; }
        if (left <= right) { for (int r = bottom; r >= top; r--) M[r][left] = k++; left++; }
    }
    return M;
}`,
        python: `def spiral_fill(n):
    M = [[0] * n for _ in range(n)]
    top, bottom, left, right, k = 0, n - 1, 0, n - 1, 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            M[top][c] = k; k += 1
        top += 1
        for r in range(top, bottom + 1):
            M[r][right] = k; k += 1
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                M[bottom][c] = k; k += 1
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                M[r][left] = k; k += 1
            left += 1
    return M`,
        js: `function spiralFill(n) {
  const M = Array.from({ length: n }, () => new Array(n).fill(0));
  let top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) M[top][c] = k++;
    top++;
    for (let r = top; r <= bottom; r++) M[r][right] = k++;
    right--;
    if (top <= bottom) { for (let c = right; c >= left; c--) M[bottom][c] = k++; bottom--; }
    if (left <= right) { for (let r = bottom; r >= top; r--) M[r][left] = k++; left++; }
  }
  return M;
}`,
        c: `void spiral_fill(int n, int M[n][n]) {
    int top = 0, bottom = n - 1, left = 0, right = n - 1, k = 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) M[top][c] = k++;
        top++;
        for (int r = top; r <= bottom; r++) M[r][right] = k++;
        right--;
        if (top <= bottom) { for (int c = right; c >= left; c--) M[bottom][c] = k++; bottom--; }
        if (left <= right) { for (int r = bottom; r >= top; r--) M[r][left] = k++; left++; }
    }
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Set matrix zeroes in O(1) extra space

        > If a cell is 0, set its whole row and column to 0. In place.

        **Why not zero as you go?** Zeroing row $r$ immediately plants new zeros that later look "original" and wipe out extra rows and columns. You must first *record* which rows and columns to clear.

        - $O(R + C)$ space: two boolean arrays \`zeroRow[r]\`, \`zeroCol[c]\`.
        - $O(1)$ space: **store those booleans inside the matrix**, in row 0 and column 0. A cell \`M[r][c] = 0\` writes \`M[r][0] = 0\` and \`M[0][c] = 0\`. Overwriting those cells is harmless: they lie in a row/column that is going to be zeroed anyway.

        Row 0 and column 0 now serve two purposes, so remember **beforehand**, in two flags, whether they contained an original zero. Apply the markers to the inner cells, then zero row 0 / column 0 last if their flags say so — doing it earlier would destroy the markers.
      `,
    },
    { t: 'viz', algo: 'arr-set-zeroes', caption: 'Purple marker cells in row 0 and column 0 replace the two boolean arrays. They are consumed before the flags finally clear the edges.' },
    {
      t: 'md',
      md: `
        ## Searching sorted matrices

        **Fully sorted** (each row sorted, and each row's first element greater than the previous row's last): the matrix *is* a sorted array of length $RC$ read row by row. Binary search on the index $k \\in [0, RC)$ and read \`M[k / C][k % C]\`: $O(\\log(RC))$.

        **Rows and columns sorted independently** (the matrix in the animation): no single order exists, but the **top-right corner** is special — it is the largest in its row and the smallest in its column. Compare it with $x$:

        - corner $> x$: everything below it in its column is even larger — **discard the column**;
        - corner $< x$: everything left of it in its row is even smaller — **discard the row**.

        Each comparison removes a row or a column, so at most $R + C - 1$ comparisons: **$O(R + C)$**. (The bottom-left corner works symmetrically; the top-left does not — both neighbours are larger, so a comparison decides nothing.)
      `,
    },
    { t: 'viz', algo: 'arr-staircase', caption: 'The path is a staircase: left when the corner is too big, down when too small. Grey rows and columns were eliminated by a single comparison each.' },
    {
      t: 'code',
      title: 'Binary search in a fully sorted matrix',
      code: {
        cpp: `bool searchSorted(const vector<vector<int>>& M, int x) {
    int R = M.size(), C = M[0].size();
    long long lo = 0, hi = 1LL * R * C - 1;
    while (lo <= hi) {
        long long mid = lo + (hi - lo) / 2;
        int v = M[mid / C][mid % C];
        if (v == x) return true;
        if (v < x) lo = mid + 1; else hi = mid - 1;
    }
    return false;
}`,
        java: `static boolean searchSorted(int[][] M, int x) {
    int R = M.length, C = M[0].length;
    long lo = 0, hi = (long) R * C - 1;
    while (lo <= hi) {
        long mid = lo + (hi - lo) / 2;
        int v = M[(int) (mid / C)][(int) (mid % C)];
        if (v == x) return true;
        if (v < x) lo = mid + 1; else hi = mid - 1;
    }
    return false;
}`,
        python: `def search_sorted(M, x):
    R, C = len(M), len(M[0])
    lo, hi = 0, R * C - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        v = M[mid // C][mid % C]
        if v == x:
            return True
        if v < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return False`,
        js: `function searchSorted(M, x) {
  const R = M.length, C = M[0].length;
  let lo = 0, hi = R * C - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const v = M[Math.floor(mid / C)][mid % C];
    if (v === x) return true;
    if (v < x) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}`,
        c: `int search_sorted(int R, int C, int M[R][C], int x) {
    long long lo = 0, hi = (long long)R * C - 1;
    while (lo <= hi) {
        long long mid = lo + (hi - lo) / 2;
        int v = M[mid / C][mid % C];
        if (v == x) return 1;
        if (v < x) lo = mid + 1; else hi = mid - 1;
    }
    return 0;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Diagonals and in-place state

        **Diagonals.** Cells on one diagonal share $r - c$; on one anti-diagonal they share $r + c$. "Diagonal traverse" (zig-zag) walks $s = r + c$ from $0$ to $R + C - 2$, alternating direction; "is the matrix Toeplitz?" checks \`M[r][c] == M[r−1][c−1]\`; sorting each diagonal groups cells by $r - c$.

        **Encoding two states in one cell.** When the new value of a cell depends on its neighbours' *old* values (Conway's Game of Life), you cannot overwrite in place — unless each cell stores both. Keep the old state in bit 0 and write the new state into bit 1; after the pass, shift every cell right by one. The same trick (store extra information in spare bits, signs, or value ranges like $v + k \\cdot n$) powers many "O(1) extra space" solutions.
      `,
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Matrix bugs that survive testing on squares',
      md: `- Mixing up \`R\` and \`C\` — test on a **non-square** matrix (2 × 3) every time.
- Transposing a square matrix with both triangles (\`for c in 0..N\`) swaps every pair twice and changes nothing.
- Set-zeroes: zeroing row 0 / column 0 **before** reading the markers.
- Flattened index: \`k / C\` and \`k % C\` — dividing by \`R\` is the classic slip.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'How these are asked',
      md: `"Rotate image" (in place, explain the decomposition), "spiral matrix" I and II, "set matrix zeroes" (follow-up: O(1) space), "search a 2D matrix" I (binary search on a flattened index) and II (staircase, $O(R + C)$ — expect "can you do better than $O(R \\log C)$?"), "game of life" (in-place state). The interviewer is checking formulas for index maps and clean boundary handling.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Rotate N × N by 90°', time: 'O(N²)', space: 'O(1)' },
        { op: 'Spiral read / spiral fill', time: 'O(RC)', space: 'O(1) besides output' },
        { op: 'Set matrix zeroes', time: 'O(RC)', space: 'O(1)', note: 'markers in row 0 / column 0' },
        { op: 'Search fully sorted matrix', time: 'O(log(RC))' },
        { op: 'Search row- and column-sorted matrix', time: 'O(R + C)', note: 'staircase from a corner' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-mt-map', 'arr-q-mt-rotate-trace', 'arr-q-mt-ccw', 'arr-q-mt-zero-naive', 'arr-q-mt-zero-order', 'arr-q-mt-staircase', 'arr-q-mt-corner', 'arr-q-mt-flat', 'arr-q-mt-spiral2'] },
  ],
}
