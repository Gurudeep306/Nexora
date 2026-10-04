import type { Page } from '../../../types'

export const kSum: Page = {
  id: 'k-sum',
  title: 'Two-sum to k-sum: hashing, sorting and de-duplication',
  summary: 'The pair-sum family end to end — unsorted two-sum with a hash map, sorted two-sum with pointers, 3-sum with a proof of de-duplication, 3-sum closest, counting triplets, and 4-sum / k-sum.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        "Find numbers that add up to a target" is the most asked array question in existence, in a dozen variants. They all come down to two tools — **a hash map** (unsorted input, need original indices) and **sorting + two pointers** (need distinct value combinations, or $O(1)$ extra space) — and one discipline: **avoid reporting duplicates**.

        ## Two-sum on an unsorted array

        > Return indices $i \\ne j$ with $a[i] + a[j] = T$.

        For each $a[j]$ the partner must be $T - a[j]$. Scan left to right with a map from value to index; before inserting $a[j]$, ask whether its partner has been seen. One pass, $O(n)$ expected time.

        **Why look up before inserting?** So that an element is never paired with itself: with $T = 6$ and $a = [3, 4]$, inserting 3 first and then looking up $6 - 3 = 3$ would "find" index 0 twice. Looking up first means the map holds only indices $< j$.
      `,
    },
    {
      t: 'code',
      title: 'Two-sum (unsorted): one pass with a hash map',
      code: {
        cpp: `pair<int,int> twoSum(const vector<int>& a, long long T) {
    unordered_map<long long, int> pos;              // value -> index
    for (int j = 0; j < (int)a.size(); j++) {
        auto it = pos.find(T - a[j]);
        if (it != pos.end()) return {it->second, j};
        pos.emplace(a[j], j);                       // keeps the first index of a repeated value
    }
    return {-1, -1};
}`,
        java: `static int[] twoSum(int[] a, long T) {
    HashMap<Long, Integer> pos = new HashMap<>();
    for (int j = 0; j < a.length; j++) {
        Integer i = pos.get(T - a[j]);
        if (i != null) return new int[]{i, j};
        pos.putIfAbsent((long) a[j], j);
    }
    return new int[]{-1, -1};
}`,
        python: `def two_sum(a, T):
    pos = {}
    for j, x in enumerate(a):
        if T - x in pos:
            return pos[T - x], j
        pos.setdefault(x, j)
    return -1, -1`,
        js: `function twoSum(a, T) {
  const pos = new Map();
  for (let j = 0; j < a.length; j++) {
    if (pos.has(T - a[j])) return [pos.get(T - a[j]), j];
    if (!pos.has(a[j])) pos.set(a[j], j);
  }
  return [-1, -1];
}`,
        c: `/* Without a hash map: sort (value, index) pairs, then two pointers. O(n log n). */
typedef struct { long long v; int i; } VI;
static int cmp_vi(const void *x, const void *y) {
    const VI *a = x, *b = y; return (a->v > b->v) - (a->v < b->v);
}
int two_sum(const int *a, int n, long long T, int *ri, int *rj) {
    VI *p = malloc(n * sizeof(VI));
    for (int k = 0; k < n; k++) { p[k].v = a[k]; p[k].i = k; }
    qsort(p, n, sizeof(VI), cmp_vi);
    int lo = 0, hi = n - 1, ok = 0;
    while (lo < hi) {
        long long s = p[lo].v + p[hi].v;
        if (s == T) { *ri = p[lo].i; *rj = p[hi].i; ok = 1; break; }
        if (s < T) lo++; else hi--;
    }
    free(p);
    return ok;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Sorted two-sum, and why the pointer walk is exhaustive

        On a sorted array, \`lo\` and \`hi\` start at the ends (see the Two Pointers page). The proof deserves to be stated precisely, because 3-sum and 4-sum reuse it:

        > **Invariant:** every pair $(i, j)$ with $i < lo$ or $j > hi$ has already been ruled out.

        If $a[lo] + a[hi] < T$, then for *every* $j \\le hi$: $a[lo] + a[j] \\le a[lo] + a[hi] < T$, so index $lo$ belongs to no solution among the remaining indices — incrementing \`lo\` keeps the invariant. The case $> T$ is symmetric. Since one pointer moves per step, the scan ends after at most $n - 1$ steps having ruled out all $\\binom{n}{2}$ pairs.

        ## 3-sum: all distinct triplets summing to zero

        > Return every **distinct** triplet of values $(x, y, z)$, taken from three different positions, with $x + y + z = 0$.

        Brute force is $O(n^3)$. Better: **sort**, then fix the smallest element of the triplet as an *anchor* \`a[i]\` and solve sorted two-sum for target $-a[i]$ on \`a[i+1..]\`. That is $n$ scans of $O(n)$: **$O(n^2)$**.

        The hard part is reporting each triplet **once**. Because the array is sorted and the triplet is listed in sorted order $(a[i] \\le a[lo] \\le a[hi])$, a duplicate report can only come from choosing a different *position* with the *same value* in one of the three roles. Two rules remove exactly those:

        1. **Skip repeated anchors** — if \`a[i] == a[i − 1]\`, every triplet starting with this value was already found with the earlier copy (whose search range was a superset).
        2. **After a hit, skip repeated partners** — move \`lo\` past all copies of \`a[lo]\` and \`hi\` past all copies of \`a[hi]\`. With the anchor and \`a[lo]\` fixed, the third value is forced, so any further copy would produce the same triplet.
      `,
    },
    { t: 'viz', algo: 'arr-three-sum', caption: 'Purple is the anchor. Watch the anchor −1 at index 2 being skipped, and the early stop when the anchor turns positive.' },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Three ways 3-sum goes wrong',
      md: `- **Dedupe with a set of triplets** after the fact — correct, but $O(n^2 \\log n)$ and the interviewer will ask you to do it properly.
- **Skipping anchors with \`a[i] == a[i + 1]\`** (looking ahead instead of behind) — loses triplets like \`(−1, −1, 2)\` that need two copies of the anchor value.
- **Skipping partners before checking for a hit** — loses \`(0, 0, 0)\` from \`[0, 0, 0]\`.`,
    },
    {
      t: 'md',
      md: `
        ## Variants on the same skeleton

        **3-sum closest.** Find the triplet sum closest to $T$. Same loops; at every step compare $|s - T|$ with the best so far, and move \`lo\` / \`hi\` toward $T$. The proof is identical: when $s < T$, the pairs $(lo, j)$ for $j < hi$ are even smaller and so even farther below $T$.

        **Count triplets with sum < T** (positions, not values). With anchor $i$ and pointers $lo < hi$: if $a[i] + a[lo] + a[hi] < T$ then *every* $j$ in $(lo, hi]$ also works with $lo$ (smaller partners), so add $hi - lo$ at once and do \`lo++\`. Otherwise \`hi−−\`. Still $O(n^2)$.

        **4-sum.** Two nested anchors $i < j$ (each with its own skip-duplicates rule), then two pointers: $O(n^3)$. In general **k-sum** reduces recursively to 2-sum: $O(n^{k-1})$. Watch overflow — four values up to $10^9$ sum to $4 \\cdot 10^9 > 2^{31}$.

        **4-sum counting across four arrays** ("how many tuples with $A[i] + B[j] + C[k] + D[l] = 0$"): meet in the middle — count all $A + B$ sums in a hash map ($n^2$ entries), then for each $C + D$ sum look up its negation: $O(n^2)$.
      `,
    },
    {
      t: 'code',
      title: '3-sum closest and 4-sum',
      code: {
        cpp: `long long threeSumClosest(vector<int> a, long long T) {
    sort(a.begin(), a.end());
    long long best = (long long)a[0] + a[1] + a[2];
    for (int i = 0; i + 2 < (int)a.size(); i++) {
        int lo = i + 1, hi = a.size() - 1;
        while (lo < hi) {
            long long s = (long long)a[i] + a[lo] + a[hi];
            if (llabs(s - T) < llabs(best - T)) best = s;
            if (s < T) lo++; else if (s > T) hi--; else return s;
        }
    }
    return best;
}
vector<array<int,4>> fourSum(vector<int> a, long long T) {
    sort(a.begin(), a.end());
    int n = a.size(); vector<array<int,4>> out;
    for (int i = 0; i < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;
        for (int j = i + 1; j < n; j++) {
            if (j > i + 1 && a[j] == a[j - 1]) continue;
            int lo = j + 1, hi = n - 1;
            while (lo < hi) {
                long long s = (long long)a[i] + a[j] + a[lo] + a[hi];
                if (s < T) lo++;
                else if (s > T) hi--;
                else {
                    out.push_back({a[i], a[j], a[lo], a[hi]});
                    while (lo < hi && a[lo] == a[lo + 1]) lo++;
                    while (lo < hi && a[hi] == a[hi - 1]) hi--;
                    lo++; hi--;
                }
            }
        }
    }
    return out;
}`,
        java: `static long threeSumClosest(int[] a, long T) {
    Arrays.sort(a);
    long best = (long) a[0] + a[1] + a[2];
    for (int i = 0; i + 2 < a.length; i++) {
        int lo = i + 1, hi = a.length - 1;
        while (lo < hi) {
            long s = (long) a[i] + a[lo] + a[hi];
            if (Math.abs(s - T) < Math.abs(best - T)) best = s;
            if (s < T) lo++; else if (s > T) hi--; else return s;
        }
    }
    return best;
}
static List<int[]> fourSum(int[] a, long T) {
    Arrays.sort(a);
    int n = a.length; List<int[]> out = new ArrayList<>();
    for (int i = 0; i < n; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;
        for (int j = i + 1; j < n; j++) {
            if (j > i + 1 && a[j] == a[j - 1]) continue;
            int lo = j + 1, hi = n - 1;
            while (lo < hi) {
                long s = (long) a[i] + a[j] + a[lo] + a[hi];
                if (s < T) lo++;
                else if (s > T) hi--;
                else {
                    out.add(new int[]{a[i], a[j], a[lo], a[hi]});
                    while (lo < hi && a[lo] == a[lo + 1]) lo++;
                    while (lo < hi && a[hi] == a[hi - 1]) hi--;
                    lo++; hi--;
                }
            }
        }
    }
    return out;
}`,
        python: `def three_sum_closest(a, T):
    a = sorted(a)
    best = a[0] + a[1] + a[2]
    for i in range(len(a) - 2):
        lo, hi = i + 1, len(a) - 1
        while lo < hi:
            s = a[i] + a[lo] + a[hi]
            if abs(s - T) < abs(best - T):
                best = s
            if s < T:
                lo += 1
            elif s > T:
                hi -= 1
            else:
                return s
    return best

def four_sum(a, T):
    a, n, out = sorted(a), len(a), []
    for i in range(n):
        if i > 0 and a[i] == a[i - 1]:
            continue
        for j in range(i + 1, n):
            if j > i + 1 and a[j] == a[j - 1]:
                continue
            lo, hi = j + 1, n - 1
            while lo < hi:
                s = a[i] + a[j] + a[lo] + a[hi]
                if s < T:
                    lo += 1
                elif s > T:
                    hi -= 1
                else:
                    out.append((a[i], a[j], a[lo], a[hi]))
                    while lo < hi and a[lo] == a[lo + 1]: lo += 1
                    while lo < hi and a[hi] == a[hi - 1]: hi -= 1
                    lo += 1; hi -= 1
    return out`,
        js: `function threeSumClosest(arr, T) {
  const a = [...arr].sort((x, y) => x - y);
  let best = a[0] + a[1] + a[2];
  for (let i = 0; i + 2 < a.length; i++) {
    let lo = i + 1, hi = a.length - 1;
    while (lo < hi) {
      const s = a[i] + a[lo] + a[hi];
      if (Math.abs(s - T) < Math.abs(best - T)) best = s;
      if (s < T) lo++; else if (s > T) hi--; else return s;
    }
  }
  return best;
}
function fourSum(arr, T) {
  const a = [...arr].sort((x, y) => x - y), n = a.length, out = [];
  for (let i = 0; i < n; i++) {
    if (i > 0 && a[i] === a[i - 1]) continue;
    for (let j = i + 1; j < n; j++) {
      if (j > i + 1 && a[j] === a[j - 1]) continue;
      let lo = j + 1, hi = n - 1;
      while (lo < hi) {
        const s = a[i] + a[j] + a[lo] + a[hi];
        if (s < T) lo++;
        else if (s > T) hi--;
        else {
          out.push([a[i], a[j], a[lo], a[hi]]);
          while (lo < hi && a[lo] === a[lo + 1]) lo++;
          while (lo < hi && a[hi] === a[hi - 1]) hi--;
          lo++; hi--;
        }
      }
    }
  }
  return out;
}`,
        c: `long long three_sum_closest(int *a, int n, long long T) {      /* a must be sorted */
    long long best = (long long)a[0] + a[1] + a[2];
    for (int i = 0; i + 2 < n; i++) {
        int lo = i + 1, hi = n - 1;
        while (lo < hi) {
            long long s = (long long)a[i] + a[lo] + a[hi];
            if (llabs(s - T) < llabs(best - T)) best = s;
            if (s < T) lo++; else if (s > T) hi--; else return s;
        }
    }
    return best;
}
/* count index triplets i < j < k with a[i] + a[j] + a[k] < T (a sorted) */
long long count_less(const int *a, int n, long long T) {
    long long cnt = 0;
    for (int i = 0; i + 2 < n; i++) {
        int lo = i + 1, hi = n - 1;
        while (lo < hi) {
            if ((long long)a[i] + a[lo] + a[hi] < T) { cnt += hi - lo; lo++; }
            else hi--;
        }
    }
    return cnt;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'What the interviewer is checking',
      md: `Two-sum: do you reach for the hash map immediately, and do you handle "same element twice"? Follow-ups: "the array is sorted" (pointers, $O(1)$ space), "return all pairs" (dedupe), "data streams in" (design \`add\`/\`find\`). 3-sum: the sort-and-anchor reduction, a **clean dedupe argument**, and the early break at \`a[i] > 0\`. 4-sum: generalising without copy-paste, and 64-bit sums.`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Two-sum, unsorted (hash map)', time: 'O(n) expected', space: 'O(n)' },
        { op: 'Two-sum, sorted (two pointers)', time: 'O(n)', space: 'O(1)' },
        { op: '3-sum / 3-sum closest / count triplets', time: 'O(n²)', space: 'O(1) besides sorting' },
        { op: '4-sum (distinct quadruplets)', time: 'O(n³)', space: 'O(1)' },
        { op: 'k-sum by recursion', time: 'O(n^(k−1))' },
        { op: '4 arrays, count tuples (meet in the middle)', time: 'O(n²)', space: 'O(n²)' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-ks-lookup-first', 'arr-q-ks-3sum-trace', 'arr-q-ks-skip-wrong', 'arr-q-ks-count-less', 'arr-q-ks-closest', 'arr-q-ks-4sum-cost', 'arr-q-ks-meet', 'arr-q-ks-overflow'] },
  ],
}

export const waterProblems: Page = {
  id: 'water-problems',
  title: 'Container with most water and trapping rain water',
  summary: 'Two famous "bars and water" problems: an exchange-argument proof for the container, and trapping rain water solved three ways — prefix maxima, two pointers, and a monotonic stack.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        ## Container with most water

        > Vertical walls of heights $h[0..n-1]$ stand at positions $0..n-1$. Choose two walls $i < j$ to hold the most water: area $= (j - i) \\cdot \\min(h[i], h[j])$.

        Trying all pairs is $O(n^2)$. The two-pointer solution starts with the widest pair and **always moves the shorter wall inward** — $O(n)$. It looks like a heuristic; here is why it is exact.

        **Claim.** If $h[lo] \\le h[hi]$, no pair $(lo, j)$ with $lo < j < hi$ beats the current area, so $lo$ can be discarded.

        **Proof.** For such a $j$: the width $j - lo < hi - lo$, and the height $\\min(h[lo], h[j]) \\le h[lo] = \\min(h[lo], h[hi])$. Both factors are at most the current ones, and the width is strictly smaller, so the area is at most the current area. Every pair involving $lo$ with the remaining walls is therefore dominated by one we have already measured. ∎

        Each step discards one wall that can never be part of a better answer, so after $n - 1$ steps every pair has been either measured or dominated.
      `,
    },
    { t: 'viz', algo: 'arr-container', caption: 'The cyan span is the current container; gold is the best seen. Each move drops the shorter wall — the note says why it is safe.' },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Moving the taller wall is wrong',
      md: `Moving the taller wall can only shrink the width, and the height is still capped by the shorter wall — so the area can never increase. On \`[1, 8, 6, 2, 5, 4, 8, 3, 7]\` moving the taller side first walks away from the optimal pair (1, 8) with area 49.`,
    },
    {
      t: 'md',
      md: `
        ## Trapping rain water

        > Bars of width 1 and heights $h[0..n-1]$. After rain, how many units of water are trapped between them?

        \`[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\` traps **6**.

        **Think per column.** Water above bar $i$ rises to the level where it would spill out on its lower side. Let $L_i$ = the tallest bar in $h[0..i]$ and $R_i$ = the tallest in $h[i..n-1]$. Then

        $$\\text{water}_i = \\min(L_i, R_i) - h[i]$$

        (never negative, since both maxima include $h[i]$ itself). The total is the sum over $i$. Computing $L_i$ and $R_i$ by scanning for every $i$ is $O(n^2)$. Three ways to do better:

        ### Way 1 — precompute both maxima (O(n) time, O(n) space)

        $L$ is a running maximum from the left, $R$ one from the right. Then one more pass adds up the water.
      `,
    },
    { t: 'viz', algo: 'arr-trap-prefix', caption: 'Two sweeps fill L and R; the third pass compares them column by column. The lower of the two gold cells is the water level.' },
    {
      t: 'md',
      md: `
        ### Way 2 — two pointers (O(n) time, O(1) space)

        We do not need *both* maxima exactly — only their minimum. Keep \`lo\` and \`hi\` with \`leftMax\` = tallest bar in $h[0..lo-1]$ and \`rightMax\` = tallest in $h[hi+1..n-1]$.

        **Key step.** Suppose \`leftMax ≤ rightMax\`. For column \`lo\`, the true left maximum is $L_{lo} = \\max(\\text{leftMax}, h[lo])$. The true right maximum $R_{lo}$ is at least \`rightMax\` (it covers even more bars), so $R_{lo} \\ge \\text{rightMax} \\ge \\text{leftMax}$. Two cases:

        - $h[lo] \\le$ leftMax: then $L_{lo}$ = leftMax $\\le R_{lo}$, so water $= \\text{leftMax} - h[lo]$.
        - $h[lo] >$ leftMax: then $L_{lo} = h[lo]$ and water $= 0 = \\max(\\text{leftMax}, h[lo]) - h[lo]$.

        Either way, **water at \`lo\` = max(leftMax, h[lo]) − h[lo]**, computable *now*, without knowing $R_{lo}$ exactly. The mirror argument settles \`hi\` when \`rightMax < leftMax\`. Each step settles one column for good.
      `,
    },
    { t: 'viz', algo: 'arr-trap-two', caption: 'Each frame settles one bar from whichever side has the smaller running maximum — that side’s water level is already certain.' },
    {
      t: 'md',
      md: `
        ### Way 3 — a monotonic stack (O(n) time, O(n) space): water in horizontal layers

        Instead of columns, count water in **horizontal layers**. Keep a stack of indices whose heights **decrease** from bottom to top — bars still waiting for a taller bar on their right. When bar $i$ is taller than the top:

        1. pop the top — it is the **floor** of a basin;
        2. the new top is the basin's **left wall**; bar $i$ is its right wall;
        3. the layer has width $i - \\text{left} - 1$ and depth $\\min(h[\\text{left}], h[i]) - h[\\text{floor}]$; add width × depth.

        Repeat while bar $i$ is taller than the top, then push $i$. Each index is pushed and popped once: $O(n)$. This "layer" view generalises to problems like *largest rectangle in a histogram*, which uses the same stack (see the Stacks chapter).
      `,
    },
    { t: 'viz', algo: 'arr-trap-stack', caption: 'On "4 2 0 3 2 5", bar 3 closes a basin of depth 2 over index 2, then the 5 closes wider layers. Each cyan band is one layer added.' },
    {
      t: 'code',
      title: 'Trapping rain water — the two-pointer version',
      code: {
        cpp: `long long trap(const vector<int>& h) {
    int lo = 0, hi = (int)h.size() - 1;
    long long leftMax = 0, rightMax = 0, total = 0;
    while (lo <= hi) {
        if (leftMax <= rightMax) {
            leftMax = max<long long>(leftMax, h[lo]);
            total += leftMax - h[lo++];
        } else {
            rightMax = max<long long>(rightMax, h[hi]);
            total += rightMax - h[hi--];
        }
    }
    return total;
}`,
        java: `static long trap(int[] h) {
    int lo = 0, hi = h.length - 1;
    long leftMax = 0, rightMax = 0, total = 0;
    while (lo <= hi) {
        if (leftMax <= rightMax) {
            leftMax = Math.max(leftMax, h[lo]);
            total += leftMax - h[lo++];
        } else {
            rightMax = Math.max(rightMax, h[hi]);
            total += rightMax - h[hi--];
        }
    }
    return total;
}`,
        python: `def trap(h):
    lo, hi = 0, len(h) - 1
    left_max = right_max = total = 0
    while lo <= hi:
        if left_max <= right_max:
            left_max = max(left_max, h[lo])
            total += left_max - h[lo]
            lo += 1
        else:
            right_max = max(right_max, h[hi])
            total += right_max - h[hi]
            hi -= 1
    return total`,
        js: `function trap(h) {
  let lo = 0, hi = h.length - 1, leftMax = 0, rightMax = 0, total = 0;
  while (lo <= hi) {
    if (leftMax <= rightMax) {
      leftMax = Math.max(leftMax, h[lo]);
      total += leftMax - h[lo++];
    } else {
      rightMax = Math.max(rightMax, h[hi]);
      total += rightMax - h[hi--];
    }
  }
  return total;
}`,
        c: `long long trap(const int *h, int n) {
    int lo = 0, hi = n - 1;
    long long leftMax = 0, rightMax = 0, total = 0;
    while (lo <= hi) {
        if (leftMax <= rightMax) {
            if (h[lo] > leftMax) leftMax = h[lo];
            total += leftMax - h[lo++];
        } else {
            if (h[hi] > rightMax) rightMax = h[hi];
            total += rightMax - h[hi--];
        }
    }
    return total;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Comparing the three

        | method | time | extra space | idea |
        |---|---|---|---|
        | brute force | $O(n^2)$ | $O(1)$ | rescan both sides for every column |
        | prefix maxima | $O(n)$ | $O(n)$ | column water = min(L, R) − h |
        | two pointers | $O(n)$ | $O(1)$ | the smaller running max is already the level |
        | monotonic stack | $O(n)$ | $O(n)$ | add water in horizontal layers |

        **Container vs trapping.** They look alike but differ: the container uses *two* walls and ignores bars between them (they don't block water); trapping counts water above *every* bar, which is blocked by bars in between.

        **2D version** ("trapping rain water II" on a height map): water escapes through the lowest point of the boundary, so the solution grows inward from the border with a min-heap — Dijkstra-like, $O(RC \\log(RC))$. It appears in the Heaps chapter.
      `,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Expect to be pushed to O(1) space',
      md: `Interviewers usually accept the prefix-maxima solution first and then ask for $O(1)$ space. The two-pointer answer is only convincing with the argument above: "the side with the smaller running maximum is the bottleneck, so its water level is already known". Say it before you code it.`,
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-wa-container', 'arr-q-wa-shorter', 'arr-q-wa-trap', 'arr-q-wa-column', 'arr-q-wa-two-why', 'arr-q-wa-stack-layer', 'arr-q-wa-diff', 'arr-q-wa-match'] },
  ],
}

export const windowCounting: Page = {
  id: 'window-counting',
  title: 'Sliding window II: counting subarrays, "exactly k", and the monotonic deque',
  summary: 'Counting subarrays with a window, the at-most-k trick that turns "exactly k" into two monotone counts, k-distinct windows with a count map, products and positives, circular windows, and sliding-window maximum with a deque.',
  minutes: 20,
  blocks: [
    {
      t: 'md',
      md: `
        The first sliding-window page found the **longest or shortest** valid window. Many problems instead ask **how many** subarrays are valid. The window answers that too — with one extra line.

        ## Counting with a window

        Suppose validity is **monotone under shrinking**: if \`a[lo..hi]\` is valid, so is every sub-window \`a[lo'..hi]\` with $lo' \\ge lo$. (True for "sum ≤ S with positive values", "at most k zeros", "at most k distinct", "product < k with positive values"…)

        After shrinking \`lo\` to the smallest valid start for the current \`hi\`, **every start in $[lo, hi]$ gives a valid subarray ending at $hi$** — that is $hi - lo + 1$ of them, and no other start works. Summing over all $hi$:

        $$\\text{count} = \\sum_{hi=0}^{n-1} (hi - lo_{hi} + 1)$$

        Still $O(n)$: both pointers only move right.

        ## "Exactly k" is two "at most" counts

        > Count subarrays with **exactly** $k$ odd numbers.

        "Exactly $k$" is *not* monotone: shrinking a window with exactly $k$ odds can leave $k - 1$. So no single window works. But

        $$\\#\\{\\text{exactly } k\\} = \\#\\{\\text{at most } k\\} - \\#\\{\\text{at most } k - 1\\}$$

        because the subarrays with at most $k$ odds split into those with exactly $k$ and those with at most $k - 1$. Each "at most" count is a monotone window. The same identity solves "subarrays with exactly k distinct integers", "binary subarrays with sum k", and more.
      `,
    },
    { t: 'viz', algo: 'arr-at-most-k', caption: 'Two passes of the same window. Each "count" frame adds hi − lo + 1 — every start in the window. The final frame subtracts the two totals.' },
    {
      t: 'code',
      title: 'Exactly k distinct integers = atMost(k) − atMost(k − 1)',
      code: {
        cpp: `long long atMostDistinct(const vector<int>& a, int k) {
    unordered_map<int, int> cnt; long long res = 0; int lo = 0;
    for (int hi = 0; hi < (int)a.size(); hi++) {
        cnt[a[hi]]++;
        while ((int)cnt.size() > k) { if (--cnt[a[lo]] == 0) cnt.erase(a[lo]); lo++; }
        res += hi - lo + 1;
    }
    return res;
}
long long exactlyDistinct(const vector<int>& a, int k) {
    return atMostDistinct(a, k) - atMostDistinct(a, k - 1);
}`,
        java: `static long atMostDistinct(int[] a, int k) {
    HashMap<Integer, Integer> cnt = new HashMap<>(); long res = 0; int lo = 0;
    for (int hi = 0; hi < a.length; hi++) {
        cnt.merge(a[hi], 1, Integer::sum);
        while (cnt.size() > k) { if (cnt.merge(a[lo], -1, Integer::sum) == 0) cnt.remove(a[lo]); lo++; }
        res += hi - lo + 1;
    }
    return res;
}
static long exactlyDistinct(int[] a, int k) { return atMostDistinct(a, k) - atMostDistinct(a, k - 1); }`,
        python: `def at_most_distinct(a, k):
    cnt, res, lo = {}, 0, 0
    for hi, x in enumerate(a):
        cnt[x] = cnt.get(x, 0) + 1
        while len(cnt) > k:
            cnt[a[lo]] -= 1
            if cnt[a[lo]] == 0:
                del cnt[a[lo]]
            lo += 1
        res += hi - lo + 1
    return res

def exactly_distinct(a, k):
    return at_most_distinct(a, k) - at_most_distinct(a, k - 1)`,
        js: `function atMostDistinct(a, k) {
  const cnt = new Map(); let res = 0, lo = 0;
  for (let hi = 0; hi < a.length; hi++) {
    cnt.set(a[hi], (cnt.get(a[hi]) ?? 0) + 1);
    while (cnt.size > k) {
      const c = cnt.get(a[lo]) - 1;
      if (c === 0) cnt.delete(a[lo]); else cnt.set(a[lo], c);
      lo++;
    }
    res += hi - lo + 1;
  }
  return res;
}
const exactlyDistinct = (a, k) => atMostDistinct(a, k) - atMostDistinct(a, k - 1);`,
        c: `/* values in 1..n: a counting array instead of a map */
long long at_most_distinct(const int *a, int n, int k, int *cnt /* size n+1, zeroed */) {
    long long res = 0; int lo = 0, d = 0;
    for (int hi = 0; hi < n; hi++) {
        if (cnt[a[hi]]++ == 0) d++;
        while (d > k) { if (--cnt[a[lo]] == 0) d--; lo++; }
        res += hi - lo + 1;
    }
    for (int i = lo; i < n; i++) cnt[a[i]] = 0;   /* reset for the next call */
    return res;
}`,
      },
    },
    {
      t: 'md',
      md: `
        ## Longest window with at most k distinct values

        The window's state is a **count map**; \`map.size\` is the number of distinct values. Shrink while it exceeds $k$, removing a key when its count reaches zero. Same skeleton solves "fruit into baskets" ($k = 2$) and "longest substring with at most k distinct characters".
      `,
    },
    { t: 'viz', algo: 'arr-k-distinct', caption: 'The hash table is the window’s state. A value leaves the table only when its count hits zero — that is the moment the distinct count drops.' },
    {
      t: 'md',
      md: `
        ## More window shapes worth knowing

        **Longest subarray with sum ≤ S (positive values).** Grow \`hi\`; while the sum exceeds $S$, drop \`a[lo]\`. Every window considered is valid after the shrink; track the longest. With negatives this breaks — use prefix sums with a monotonic structure (sorted prefix minima + binary search, $O(n \\log n)$).

        **Count subarrays with product < k (positive values).** The same counting rule with a running product: \`count += hi − lo + 1\`. Guard $k \\le 1$ (no subarray qualifies) to avoid an infinite shrink.

        **Max consecutive ones with at most k flips** — "at most k zeros in the window" (on the first window page).

        **Maximum sum of k consecutive elements in a circular array.** Windows may wrap around the end. Either walk $i$ from 0 to $n + k - 2$ and read \`a[i % n]\`, or — equivalently — run the fixed window over the array concatenated with its first $k - 1$ elements. Each of the $n$ windows is visited once: $O(n)$.

        ## Sliding window maximum: the monotonic deque

        > For every window of size $k$, report its maximum.

        A running sum can be patched when an element leaves; a running **maximum** cannot — if the max leaves, which value is next? Rescanning each window is $O(nk)$. A heap gives $O(n \\log n)$. A **deque of candidate indices** gives $O(n)$:

        - Keep indices whose values are **strictly decreasing from front to back**.
        - When \`a[i]\` arrives, pop from the **back** every index with value $\\le a[i]$: those elements are older *and* no larger, so while \`a[i]\` is in the window they can never be the maximum — and they leave the window before \`a[i]\` does.
        - Pop the **front** if it has slid out of the window.
        - The **front** is the current maximum.

        Every index is pushed once and popped at most once, so the total work is $O(n)$ despite the inner \`while\`.
      `,
    },
    { t: 'viz', algo: 'arr-sliding-max', caption: 'Red cells were evicted from the back by a newer, bigger value. The deque’s front (green) is always the maximum of the cyan window.' },
    {
      t: 'code',
      title: 'Circular max sum of k consecutive, and subarrays with product < k',
      code: {
        cpp: `long long circularWindowMax(const vector<int>& a, int k) {   // 1 <= k <= n
    int n = a.size(); long long s = 0;
    for (int i = 0; i < k; i++) s += a[i];
    long long best = s;
    for (int i = k; i < n + k - 1; i++) {      // window ends at i % n
        s += a[i % n] - a[(i - k) % n];
        best = max(best, s);
    }
    return best;
}
long long countProductLess(const vector<int>& a, long long k) {   // a[i] >= 1
    if (k <= 1) return 0;
    long long prod = 1, cnt = 0; int lo = 0;
    for (int hi = 0; hi < (int)a.size(); hi++) {
        prod *= a[hi];
        while (prod >= k) prod /= a[lo++];
        cnt += hi - lo + 1;
    }
    return cnt;
}`,
        java: `static long circularWindowMax(int[] a, int k) {
    int n = a.length; long s = 0;
    for (int i = 0; i < k; i++) s += a[i];
    long best = s;
    for (int i = k; i < n + k - 1; i++) {
        s += a[i % n] - a[(i - k) % n];
        best = Math.max(best, s);
    }
    return best;
}
static long countProductLess(int[] a, long k) {
    if (k <= 1) return 0;
    long prod = 1, cnt = 0; int lo = 0;
    for (int hi = 0; hi < a.length; hi++) {
        prod *= a[hi];
        while (prod >= k) prod /= a[lo++];
        cnt += hi - lo + 1;
    }
    return cnt;
}`,
        python: `def circular_window_max(a, k):
    n = len(a)
    s = sum(a[:k])
    best = s
    for i in range(k, n + k - 1):
        s += a[i % n] - a[(i - k) % n]
        best = max(best, s)
    return best

def count_product_less(a, k):
    if k <= 1:
        return 0
    prod, cnt, lo = 1, 0, 0
    for hi, x in enumerate(a):
        prod *= x
        while prod >= k:
            prod //= a[lo]
            lo += 1
        cnt += hi - lo + 1
    return cnt`,
        js: `function circularWindowMax(a, k) {
  const n = a.length;
  let s = 0;
  for (let i = 0; i < k; i++) s += a[i];
  let best = s;
  for (let i = k; i < n + k - 1; i++) {
    s += a[i % n] - a[(i - k) % n];
    best = Math.max(best, s);
  }
  return best;
}
function countProductLess(a, k) {
  if (k <= 1) return 0;
  let prod = 1, cnt = 0, lo = 0;
  for (let hi = 0; hi < a.length; hi++) {
    prod *= a[hi];
    while (prod >= k) prod /= a[lo++];
    cnt += hi - lo + 1;
  }
  return cnt;
}`,
        c: `long long circular_window_max(const int *a, int n, int k) {
    long long s = 0;
    for (int i = 0; i < k; i++) s += a[i];
    long long best = s;
    for (int i = k; i < n + k - 1; i++) {
        s += a[i % n] - a[(i - k) % n];
        if (s > best) best = s;
    }
    return best;
}
long long count_product_less(const int *a, int n, long long k) {
    if (k <= 1) return 0;
    long long prod = 1, cnt = 0; int lo = 0;
    for (int hi = 0; hi < n; hi++) {
        prod *= a[hi];
        while (prod >= k) prod /= a[lo++];
        cnt += hi - lo + 1;
    }
    return cnt;
}`,
      },
    },
    {
      t: 'callout',
      kind: 'pitfall',
      title: 'Is the condition really monotone?',
      md: `Before writing \`while (invalid) lo++\`, check: **if a window is valid, is every shorter window with the same right end valid too?** "At most k distinct" — yes. "Sum ≤ S" with positives — yes; with negatives — no. "Exactly k" — no (use the at-most trick). "Sum ≥ S" is the mirror image (valid windows *extend*): there, shrink *while still valid* to find the shortest, and count with \`count += lo\` after shrinking.`,
    },
    {
      t: 'callout',
      kind: 'interview',
      title: 'Recognising window problems',
      md: `Phrases: "**contiguous** subarray/substring", "longest/shortest", "at most / at least k", "number of subarrays such that". Strong candidates state the window invariant ("the window never has more than k zeros"), justify $O(n)$ by "each pointer moves at most n times", and know the escape hatches: prefix sums + hashing when values can be negative, and the at-most trick when the condition is "exactly".`,
    },
    {
      t: 'complexity',
      rows: [
        { op: 'Count subarrays satisfying a monotone condition', time: 'O(n)', space: 'O(state)' },
        { op: 'Exactly k (two at-most passes)', time: 'O(n)', space: 'O(distinct)' },
        { op: 'Longest with at most k distinct', time: 'O(n)', space: 'O(k)' },
        { op: 'Circular fixed window', time: 'O(n)', space: 'O(1)' },
        { op: 'Sliding window maximum (deque)', time: 'O(n)', space: 'O(k)', note: 'heap: O(n log n); rescan: O(nk)' },
      ],
    },
    { t: 'check', title: 'Check yourself', ids: ['arr-q-wc-count', 'arr-q-wc-exactly', 'arr-q-wc-identity', 'arr-q-wc-kdistinct', 'arr-q-wc-deque-trace', 'arr-q-wc-deque-why', 'arr-q-wc-circular', 'arr-q-wc-product', 'arr-q-wc-monotone'] },
  ],
}
