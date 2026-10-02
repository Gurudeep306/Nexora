"""Arrays — judged problems."""
import random
from lib import *  # noqa: F401,F403


# ─────────────────────────── Traversal ───────────────────────────


def sol_sum(s):
    v = ints(s)
    return str(sum(v[1:1 + v[0]]))


add('arr-c-sum', 'Sum of the array', 'arrays', 'traversal', 800, ['arrays', 'implementation'],
    '<p>Given n integers, print their sum.</p><p>Values can be as large as 10<sup>9</sup> in absolute value, so the sum may not fit in a 32-bit integer.</p>',
    N_SPEC + '<p>Each value satisfies |a<sub>i</sub>| ≤ 10<sup>9</sup>.</p>', '<p>Print one integer: the sum.</p>', sol_sum,
    [arr_input([1, 2, 3, 4, 5]), arr_input([-7, 10, -3])],
    [arr_input([5]), arr_input([10**9] * 5), arr_input([-10**9] * 4), arr_input([0, 0, 0])],
    lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(random.randint(1, SIZE))]))


def sol_maxmin(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    return f"{max(a)} {min(a)}"


add('arr-c-max-min', 'Maximum and minimum', 'arrays', 'traversal', 800, ['arrays'],
    '<p>Print the largest and the smallest of n integers, in one pass.</p><p>Careful: the numbers may all be negative.</p>',
    N_SPEC + '<p>|a<sub>i</sub>| ≤ 10<sup>9</sup>.</p>', '<p>Print the maximum and the minimum, separated by a space.</p>', sol_maxmin,
    [arr_input([3, 9, -2, 7]), arr_input([-5, -1, -9])],
    [arr_input([42]), arr_input([-3, -3, -3]), arr_input([-10**9, 10**9])],
    lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(random.randint(1, SIZE))]))


def sol_second(s):
    v = ints(s)
    d = sorted(set(v[1:1 + v[0]]))
    return str(d[-2]) if len(d) >= 2 else '-1'


add('arr-c-second', 'Second largest distinct', 'arrays', 'traversal', 1000, ['arrays'],
    '<p>Print the second largest <b>distinct</b> value in the array. If all values are equal, print <code>-1</code>.</p><p>Try to do it in one pass without sorting.</p>',
    N_SPEC + '<p>0 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>.</p>', '<p>One integer.</p>', sol_second,
    [arr_input([5, 9, 9, 3, 7, 9]), arr_input([4, 4, 4])],
    [arr_input([1]), arr_input([2, 1]), arr_input([1, 2]), arr_input([7, 7, 3])],
    lambda: arr_input([random.randint(0, random.choice([5, 10**9])) for _ in range(random.randint(1, SIZE))]))

# ─────────────────────────── Insert / delete ───────────────────────────


def sol_insert(s):
    v = ints(s)
    n = v[0]
    a = v[1:1 + n]
    p, x = v[1 + n], v[2 + n]
    a.insert(p, x)
    return fmt(a)


add('arr-c-insert', 'Insert at a position', 'arrays', 'insert-delete', 800, ['arrays'],
    '<p>Insert the value x so that it ends up at index p (0-based), shifting the later elements right. Print the resulting array.</p>',
    '<p>First line n (1 ≤ n ≤ 10<sup>5</sup>). Second line n integers. Third line p and x (0 ≤ p ≤ n).</p>',
    '<p>The n + 1 values after insertion, space-separated.</p>', sol_insert,
    [arr_input([3, 8, 14, 20], extra_after='2 11'), arr_input([1, 2], extra_after='0 9')],
    [arr_input([1, 2, 3], extra_after='3 4'), arr_input([5], extra_after='0 4'), arr_input([5], extra_after='1 6')],
    lambda: (lambda a: arr_input(a, extra_after=f"{random.randint(0, len(a))} {random.randint(-100, 100)}"))([random.randint(-100, 100) for _ in range(random.randint(1, 3000))]))


def sol_delete(s):
    v = ints(s)
    n = v[0]
    a = v[1:1 + n]
    del a[v[1 + n]]
    return fmt(a) if a else 'EMPTY'


add('arr-c-delete', 'Delete at a position', 'arrays', 'insert-delete', 800, ['arrays'],
    '<p>Remove the element at index p (0-based), shifting the later elements left. Print the array, or <code>EMPTY</code> if nothing is left.</p>',
    '<p>First line n (1 ≤ n ≤ 10<sup>5</sup>). Second line n integers. Third line p (0 ≤ p &lt; n).</p>',
    '<p>The remaining n − 1 values, or EMPTY.</p>', sol_delete,
    [arr_input([5, 10, 15, 20, 25], extra_after='1'), arr_input([7], extra_after='0')],
    [arr_input([1, 2, 3], extra_after='2'), arr_input([1, 2, 3], extra_after='0')],
    lambda: (lambda a: arr_input(a, extra_after=str(random.randint(0, len(a) - 1))))([random.randint(-100, 100) for _ in range(random.randint(1, 3000))]))

# ─────────────────────────── Searching ───────────────────────────


def sol_first(s):
    v = ints(s)
    n = v[0]
    a = v[1:1 + n]
    x = v[1 + n]
    return str(a.index(x)) if x in a else '-1'


add('arr-c-linear-search', 'First occurrence', 'arrays', 'searching', 800, ['arrays', 'searching'],
    '<p>Print the index (0-based) of the first occurrence of x in the array, or <code>-1</code> if it does not occur.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers. Third line x.</p>', '<p>One integer.</p>', sol_first,
    [arr_input([14, 3, 27, 9, 3], extra_after='3'), arr_input([1, 2, 3], extra_after='7')],
    [arr_input([5], extra_after='5'), arr_input([5], extra_after='6'), arr_input([2, 2, 2], extra_after='2')],
    lambda: (lambda a: arr_input(a, extra_after=str(random.choice(a) if random.random() < 0.7 else 1001)))([random.randint(1, 1000) for _ in range(random.randint(1, SIZE))]))


def sol_count(s):
    lines = s.strip().split('\n')
    n = int(lines[0])
    a = ints(lines[1])
    q = int(lines[2])
    from collections import Counter
    c = Counter(a)
    return '\n'.join(str(c[int(x)]) for x in lines[3].split()[:q])


def gen_count():
    n = random.randint(1, SIZE)
    a = [random.randint(1, 50) for _ in range(n)]
    q = random.randint(1, SIZE)
    return f"{n}\n{fmt(a)}\n{q}\n{fmt([random.randint(1, 55) for _ in range(q)])}\n"


add('arr-c-count', 'Answer occurrence queries', 'arrays', 'searching', 1100, ['arrays', 'counting'],
    '<p>Given an array and q queries, answer for each query value how many times it occurs in the array.</p><p>n and q can both be 2·10<sup>5</sup>: scanning the array for every query is too slow. Values are small (1…100), so count them once.</p>',
    '<p>Line 1: n. Line 2: n integers (1 ≤ a<sub>i</sub> ≤ 100). Line 3: q. Line 4: q query values (1 ≤ x ≤ 100).</p>',
    '<p>q lines, the count for each query.</p>', sol_count,
    ["5\n4 2 7 2 9\n3\n2 7 5\n"], ["1\n1\n1\n1\n", "3\n5 5 5\n2\n5 6\n"], gen_count,
    large=lambda: (lambda n: f"{n}\n{fmt([random.randint(1, 100) for _ in range(n)])}\n{n}\n{fmt([random.randint(1, 100) for _ in range(n)])}\n")(LARGE))

# ─────────────────────────── Reverse / rotate ───────────────────────────


def sol_reverse(s):
    v = ints(s)
    return fmt(v[1:1 + v[0]][::-1])


add('arr-c-reverse', 'Reverse the array', 'arrays', 'reverse-rotate', 800, ['arrays', 'two pointers'],
    '<p>Reverse the array in place (two pointers) and print it.</p>', N_SPEC, '<p>The reversed array.</p>', sol_reverse,
    [arr_input([1, 2, 3, 4, 5]), arr_input([9, 8])], [arr_input([7])],
    lambda: arr_input([random.randint(-10**6, 10**6) for _ in range(random.randint(1, SIZE))]))


def sol_rotate(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    k %= n
    return fmt(a[n - k:] + a[:n - k])


add('arr-c-rotate', 'Rotate right by k', 'arrays', 'reverse-rotate', 1000, ['arrays'],
    '<p>Rotate the array to the right by k positions: the last k elements move to the front, in order. k may be larger than n.</p><p>Aim for O(n) time and O(1) extra space (three reversals).</p>',
    '<p>First line n and k (1 ≤ n ≤ 2·10<sup>5</sup>, 0 ≤ k ≤ 10<sup>18</sup>). Second line n integers.</p>',
    '<p>The rotated array.</p>', sol_rotate,
    ["7 3\n1 2 3 4 5 6 7\n", "5 12\n10 20 30 40 50\n"],
    ["1 5\n42\n", "4 0\n1 2 3 4\n", "4 4\n1 2 3 4\n", "3 1000000000000000000\n1 2 3\n"],
    lambda: (lambda n: f"{n} {random.randint(0, 10**18 if random.random() < 0.3 else 3 * n)}\n{fmt([random.randint(1, 10**6) for _ in range(n)])}\n")(random.randint(1, SIZE)))

# ─────────────────────────── Prefix sums ───────────────────────────


def sol_range(s):
    lines = s.strip().split('\n')
    n, q = ints(lines[0])
    a = ints(lines[1])
    P = [0]
    for x in a:
        P.append(P[-1] + x)
    out = []
    for i in range(q):
        l, r = ints(lines[2 + i])
        out.append(str(P[r + 1] - P[l]))
    return '\n'.join(out)


def gen_range():
    n = random.randint(1, SIZE)
    q = random.randint(1, SIZE)
    a = [random.randint(-10**9, 10**9) for _ in range(n)]
    qs = []
    for _ in range(q):
        l = random.randint(0, n - 1)
        qs.append(f"{l} {random.randint(l, n - 1)}")
    return f"{n} {q}\n{fmt(a)}\n" + '\n'.join(qs) + '\n'


add('arr-c-range-sum', 'Range sum queries', 'arrays', 'prefix-sums', 1100, ['arrays', 'prefix sums'],
    '<p>Answer q queries: each gives l and r (0-based, inclusive) and asks for a<sub>l</sub> + … + a<sub>r</sub>.</p><p>With n, q up to 2·10<sup>5</sup> you need O(1) per query.</p>',
    '<p>Line 1: n q. Line 2: n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>). Next q lines: l r (0 ≤ l ≤ r &lt; n).</p>',
    '<p>q lines, one sum each.</p>', sol_range,
    ["8 3\n3 1 4 1 5 9 2 6\n2 5\n0 7\n4 4\n"], ["1 1\n-5\n0 0\n", "3 2\n1000000000 1000000000 1000000000\n0 2\n1 2\n"], gen_range,
    large=lambda: f"{LARGE} {LARGE}\n{fmt([random.randint(-10**9, 10**9) for _ in range(LARGE)])}\n" + '\n'.join(f"0 {LARGE - 1 - random.randint(0, 5)}" for _ in range(LARGE)) + '\n')


def sol_eq(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    total = sum(a)
    left = 0
    for i, x in enumerate(a):
        if left == total - left - x:
            return str(i)
        left += x
    return '-1'


def gen_eq():
    n = random.randint(1, 3000)
    a = [random.randint(-20, 20) for _ in range(n)]
    if random.random() < 0.6 and n >= 3:
        i = random.randint(1, n - 2)
        diff = sum(a[:i]) - sum(a[i + 1:])
        a[-1] += diff
    return arr_input(a)


add('arr-c-equilibrium', 'Equilibrium index', 'arrays', 'prefix-sums', 1100, ['arrays', 'prefix sums'],
    '<p>An index i is an <b>equilibrium index</b> if the sum of the elements strictly left of i equals the sum strictly right of i (an empty side sums to 0). Print the smallest such index, or <code>-1</code>.</p>',
    N_SPEC + '<p>|a<sub>i</sub>| ≤ 10<sup>4</sup>.</p>', '<p>One integer.</p>', sol_eq,
    [arr_input([-7, 1, 5, 2, -4, 3, 0]), arr_input([1, 2, 3])],
    [arr_input([5]), arr_input([0, 0]), arr_input([1, -1, 1])], gen_eq)


def sol_range_add(s):
    lines = s.strip().split('\n')
    n, m = ints(lines[0])
    a = ints(lines[1])
    D = [0] * (n + 1)
    for i in range(m):
        l, r, v = ints(lines[2 + i])
        D[l] += v
        D[r + 1] -= v
    run = 0
    out = []
    for i in range(n):
        run += D[i]
        out.append(a[i] + run)
    return fmt(out)


def gen_range_add():
    n = random.randint(1, SIZE)
    m = random.randint(1, SIZE)
    a = [random.randint(-10**6, 10**6) for _ in range(n)]
    ups = []
    for _ in range(m):
        l = random.randint(0, n - 1)
        ups.append(f"{l} {random.randint(l, n - 1)} {random.randint(-10**6, 10**6)}")
    return f"{n} {m}\n{fmt(a)}\n" + '\n'.join(ups) + '\n'


add('arr-c-range-add', 'Many range additions', 'arrays', 'prefix-sums', 1200, ['arrays', 'difference array'],
    '<p>Apply m updates to the array; each adds v to every element with index in [l, r]. Print the final array.</p><p>Doing each update element by element is O(n·m) — use a difference array.</p>',
    '<p>Line 1: n m (≤ 2·10<sup>5</sup>). Line 2: n integers. Next m lines: l r v (0 ≤ l ≤ r &lt; n, |v| ≤ 10<sup>6</sup>).</p>',
    '<p>The final array.</p>', sol_range_add,
    ["6 2\n0 0 0 0 0 0\n1 3 3\n2 5 2\n"], ["1 1\n5\n0 0 -5\n"], gen_range_add,
    large=lambda: f"{LARGE} {LARGE}\n{fmt([random.randint(-10**6, 10**6) for _ in range(LARGE)])}\n" + '\n'.join(f"{random.randint(0, 5)} {LARGE - 1 - random.randint(0, 5)} {random.randint(-10**6, 10**6)}" for _ in range(LARGE)) + '\n')

# ─────────────────────────── Two pointers ───────────────────────────


def sol_pair(s):
    v = ints(s)
    n, T = v[0], v[1]
    a = v[2:2 + n]
    lo, hi = 0, n - 1
    while lo < hi:
        t = a[lo] + a[hi]
        if t == T:
            return 'YES'
        if t < T:
            lo += 1
        else:
            hi -= 1
    return 'NO'


def gen_pair():
    n = random.randint(1, SIZE)
    a = sorted(random.randint(-10**6, 10**6) for _ in range(n))
    T = a[random.randint(0, n - 1)] + a[random.randint(0, n - 1)] if random.random() < 0.5 else random.randint(-2 * 10**6, 2 * 10**6)
    return f"{n} {T}\n{fmt(a)}\n"


add('arr-c-pair-sum', 'Pair with sum in a sorted array', 'arrays', 'two-pointers', 900, ['arrays', 'two pointers'],
    '<p>The array is sorted in non-decreasing order. Is there a pair of <b>different positions</b> i &lt; j with a<sub>i</sub> + a<sub>j</sub> = T? Print YES or NO.</p>',
    '<p>First line n and T. Second line n sorted integers (|a<sub>i</sub>| ≤ 10<sup>6</sup>).</p>', '<p>YES or NO.</p>', sol_pair,
    ["7 17\n1 3 4 6 8 11 14\n", "4 100\n1 2 3 4\n"], ["1 10\n5\n", "2 10\n5 5\n", "3 10\n5 6 7\n"], gen_pair)


def sol_dedupe(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    out = [a[0]]
    for x in a[1:]:
        if x != out[-1]:
            out.append(x)
    return f"{len(out)}\n{fmt(out)}"


add('arr-c-dedupe', 'Remove duplicates from a sorted array', 'arrays', 'two-pointers', 900, ['arrays', 'two pointers'],
    '<p>The array is sorted. Remove duplicates in place so each value appears once. Print the number of unique values, then the unique values in order.</p>',
    N_SPEC + '<p>The values are sorted in non-decreasing order.</p>', '<p>Line 1: k. Line 2: the k values.</p>', sol_dedupe,
    [arr_input([1, 1, 2, 3, 3, 3, 5]), arr_input([4, 4, 4])], [arr_input([9]), arr_input([1, 2, 3])],
    lambda: arr_input(sorted(random.randint(0, random.choice([5, 50, 10**6])) for _ in range(random.randint(1, SIZE)))))


def sol_zeroes(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    nz = [x for x in a if x != 0]
    return fmt(nz + [0] * (len(a) - len(nz)))


add('arr-c-move-zeroes', 'Move zeroes to the end', 'arrays', 'two-pointers', 900, ['arrays', 'two pointers'],
    '<p>Move every 0 to the end of the array while keeping the relative order of the non-zero values. Print the result.</p>',
    N_SPEC, '<p>The rearranged array.</p>', sol_zeroes,
    [arr_input([0, 1, 0, 3, 12]), arr_input([0, 0, 1])], [arr_input([0]), arr_input([4, 5]), arr_input([0, 0, 0])],
    lambda: arr_input([0 if random.random() < 0.4 else random.randint(-100, 100) for _ in range(random.randint(1, SIZE))]))

# ─────────────────────────── Sliding window ───────────────────────────


def sol_window(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    cur = sum(a[:k])
    best = cur
    for i in range(k, n):
        cur += a[i] - a[i - k]
        best = max(best, cur)
    return str(best)


add('arr-c-window-max', 'Best window of size k', 'arrays', 'sliding-window', 900, ['arrays', 'sliding window'],
    '<p>Print the maximum sum of k consecutive elements.</p>',
    '<p>First line n and k (1 ≤ k ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_window,
    ["8 3\n2 1 5 1 3 2 7 1\n", "4 2\n-5 -1 -3 -2\n"], ["1 1\n-7\n", "5 5\n1 2 3 4 5\n"],
    lambda: (lambda n: f"{n} {random.randint(1, n)}\n{fmt([random.randint(-10**9, 10**9) for _ in range(n)])}\n")(random.randint(1, SIZE)))


def sol_minlen(s):
    v = ints(s)
    n, S = v[0], v[1]
    a = v[2:2 + n]
    lo = 0
    tot = 0
    best = n + 1
    for hi in range(n):
        tot += a[hi]
        while tot >= S:
            best = min(best, hi - lo + 1)
            tot -= a[lo]
            lo += 1
    return str(0 if best == n + 1 else best)


add('arr-c-min-len', 'Shortest subarray with sum ≥ S', 'arrays', 'sliding-window', 1200, ['arrays', 'sliding window'],
    '<p>All values are positive. Print the length of the shortest contiguous subarray whose sum is at least S, or 0 if there is none.</p>',
    '<p>First line n and S (1 ≤ n ≤ 2·10<sup>5</sup>, 1 ≤ S ≤ 10<sup>15</sup>). Second line n integers (1 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>).</p>',
    '<p>One integer.</p>', sol_minlen,
    ["6 7\n2 3 1 2 4 3\n", "3 100\n1 2 3\n"], ["1 5\n5\n", "1 6\n5\n", "4 4\n1 1 1 1\n"],
    lambda: (lambda n: f"{n} {random.randint(1, 50 * n)}\n{fmt([random.randint(1, 100) for _ in range(n)])}\n")(random.randint(1, SIZE)))


def sol_ones(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    lo = zeros = best = 0
    for hi in range(n):
        zeros += a[hi] == 0
        while zeros > k:
            zeros -= a[lo] == 0
            lo += 1
        best = max(best, hi - lo + 1)
    return str(best)


add('arr-c-longest-ones', 'Longest run of ones with k flips', 'arrays', 'sliding-window', 1300, ['arrays', 'sliding window'],
    '<p>The array contains only 0s and 1s. You may flip at most k zeroes to ones. Print the length of the longest block of consecutive ones you can get.</p>',
    '<p>First line n and k (0 ≤ k ≤ n ≤ 2·10<sup>5</sup>). Second line n values, each 0 or 1.</p>', '<p>One integer.</p>', sol_ones,
    ["11 2\n1 1 1 0 0 0 1 1 1 1 0\n", "4 0\n0 0 0 0\n"], ["1 1\n0\n", "3 0\n1 1 1\n"],
    lambda: (lambda n: f"{n} {random.randint(0, n)}\n{fmt([random.randint(0, 1) for _ in range(n)])}\n")(random.randint(1, SIZE)))

# ─────────────────────────── Kadane ───────────────────────────


def sol_kadane(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    cur = best = a[0]
    for x in a[1:]:
        cur = max(x, cur + x)
        best = max(best, cur)
    return str(best)


add('arr-c-kadane', 'Maximum subarray sum', 'arrays', 'kadane', 1100, ['arrays', 'dp', 'kadane'],
    '<p>Print the largest possible sum of a <b>non-empty</b> contiguous subarray.</p>', N_SPEC + '<p>|a<sub>i</sub>| ≤ 10<sup>9</sup>.</p>',
    '<p>One integer.</p>', sol_kadane,
    [arr_input([-2, 1, -3, 4, -1, 2, 1, -5, 4]), arr_input([-8, -3, -6])],
    [arr_input([5]), arr_input([-1]), arr_input([10**9] * 5)],
    lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(random.randint(1, SIZE))]))

# ─────────────────────────── 2D ───────────────────────────


def mat_input(M):
    return f"{len(M)} {len(M[0])}\n" + '\n'.join(fmt(r) for r in M) + '\n'


def read_mat(s):
    lines = s.strip().split('\n')
    R, C = ints(lines[0])
    return [ints(lines[1 + r]) for r in range(R)]


def sol_transpose(s):
    M = read_mat(s)
    return '\n'.join(fmt(col) for col in zip(*M))


def gen_mat():
    R, C = random.randint(1, 60), random.randint(1, 60)
    return mat_input([[random.randint(-99, 99) for _ in range(C)] for _ in range(R)])


add('arr-c-transpose', 'Transpose a matrix', 'arrays', '2d-arrays', 900, ['arrays', 'matrices'],
    '<p>Print the transpose of the R × C matrix: row i of the output is column i of the input.</p>',
    '<p>First line R and C (1 ≤ R, C ≤ 500). Next R lines: C integers each.</p>', '<p>C lines with R integers each.</p>', sol_transpose,
    ["2 3\n1 2 3\n4 5 6\n"], ["1 1\n7\n", "1 4\n1 2 3 4\n", "3 1\n1\n2\n3\n"], gen_mat)


def sol_spiral(s):
    M = read_mat(s)
    R, C = len(M), len(M[0])
    top, bot, lef, rig = 0, R - 1, 0, C - 1
    out = []
    while top <= bot and lef <= rig:
        for c in range(lef, rig + 1):
            out.append(M[top][c])
        top += 1
        for r in range(top, bot + 1):
            out.append(M[r][rig])
        rig -= 1
        if top <= bot:
            for c in range(rig, lef - 1, -1):
                out.append(M[bot][c])
            bot -= 1
        if lef <= rig:
            for r in range(bot, top - 1, -1):
                out.append(M[r][lef])
            lef += 1
    return fmt(out)


add('arr-c-spiral', 'Spiral order', 'arrays', '2d-arrays', 1200, ['arrays', 'matrices', 'simulation'],
    '<p>Print all elements of the matrix in clockwise spiral order, starting at the top-left corner.</p>',
    '<p>First line R and C (1 ≤ R, C ≤ 500). Next R lines: C integers each.</p>', '<p>R·C integers on one line.</p>', sol_spiral,
    ["3 3\n1 2 3\n4 5 6\n7 8 9\n", "3 4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n"], ["1 1\n5\n", "1 3\n1 2 3\n", "3 1\n1\n2\n3\n", "2 2\n1 2\n3 4\n"], gen_mat)


# ─────────────────────────── Arrays, round 2 ───────────────────────────


def sol_rotmat(s):
    lines = s.strip().split('\n')
    n = int(lines[0])
    M = [ints(lines[1 + r]) for r in range(n)]
    R = [[M[n - 1 - c][r] for c in range(n)] for r in range(n)]
    return '\n'.join(fmt(r) for r in R)


def sq_input(M):
    return f"{len(M)}\n" + '\n'.join(fmt(r) for r in M) + '\n'


add('arr-c-rotate-matrix', 'Rotate a square matrix', 'arrays', '2d-arrays', 1200, ['arrays', 'matrices'],
    '<p>Rotate the N × N matrix by 90° <b>clockwise</b> and print it.</p><p>Try to do it in place: transpose, then reverse every row.</p>',
    '<p>First line N (1 ≤ N ≤ 500). Next N lines: N integers each (|a| ≤ 10<sup>9</sup>).</p>', '<p>The rotated matrix, N lines.</p>', sol_rotmat,
    ["3\n1 2 3\n4 5 6\n7 8 9\n", "2\n1 2\n3 4\n"], ["1\n42\n", "4\n1 2 3 4\n5 6 7 8\n9 10 11 12\n13 14 15 16\n"],
    lambda: (lambda n: sq_input([[random.randint(-99, 99) for _ in range(n)] for _ in range(n)]))(random.randint(1, 60)))


def sol_leaders(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    out, best = [], None
    for x in reversed(a):
        if best is None or x > best:
            out.append(x)
            best = x
    return fmt(out[::-1])


add('arr-c-leaders', 'Leaders of an array', 'arrays', 'traversal', 900, ['arrays'],
    '<p>An element is a <b>leader</b> if it is strictly greater than every element to its right. The last element is always a leader.</p><p>Print all leaders in their original left-to-right order. Aim for one pass.</p>',
    N_SPEC + '<p>|a<sub>i</sub>| ≤ 10<sup>9</sup>.</p>', '<p>The leaders, space-separated.</p>', sol_leaders,
    [arr_input([16, 17, 4, 3, 5, 2]), arr_input([7, 10, 4, 10, 6, 5, 2])],
    [arr_input([5]), arr_input([1, 2, 3, 4]), arr_input([4, 3, 2, 1]), arr_input([3, 3, 3])],
    lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(random.randint(1, SIZE))]),
    large=lambda: arr_input([random.randint(1, 10**9) for _ in range(LARGE)]))


def sol_major(s):
    v = ints(s)
    a = v[1:1 + v[0]]
    from collections import Counter
    x, c = Counter(a).most_common(1)[0]
    return str(x) if c * 2 > len(a) else '-1'


def gen_major():
    n = random.randint(1, SIZE)
    if random.random() < 0.6:
        m = random.randint(-10**9, 10**9)
        k = n // 2 + 1 + random.randint(0, n - n // 2 - 1)
        a = [m] * k + [random.randint(-10**9, 10**9) for _ in range(n - k)]
    else:
        a = [random.randint(1, 5) for _ in range(n)]
    random.shuffle(a)
    return arr_input(a)


add('arr-c-majority', 'Majority element', 'arrays', 'traversal', 1200, ['arrays', 'boyer-moore'],
    '<p>Print the value that appears <b>more than n/2 times</b>, or <code>-1</code> if no value does.</p><p>Try Boyer–Moore voting: O(n) time, O(1) extra space — and remember to verify the candidate.</p>',
    N_SPEC + '<p>|a<sub>i</sub>| ≤ 10<sup>9</sup>; the answer is never −1 as a value (a<sub>i</sub> ≠ −1).</p>', '<p>One integer.</p>', sol_major,
    [arr_input([2, 2, 1, 3, 2, 1, 2, 2, 3]), arr_input([1, 2, 3])],
    [arr_input([7]), arr_input([1, 2]), arr_input([4, 4]), arr_input([1, 1, 2, 2]), arr_input([5, 5, 6, 6, 5])],
    lambda: gen_major().replace('-1 ', '-2 ').replace(' -1\n', ' -2\n'))


def sol_dutch(s):
    v = ints(s)
    return fmt(sorted(v[1:1 + v[0]]))


add('arr-c-dutch', 'Sort 0s, 1s and 2s', 'arrays', 'two-pointers', 1100, ['arrays', 'two pointers', 'dutch flag'],
    '<p>The array contains only 0, 1 and 2. Sort it in one pass with O(1) extra space (Dutch national flag) and print it.</p>',
    N_SPEC + '<p>Each a<sub>i</sub> is 0, 1 or 2.</p>', '<p>The sorted array.</p>', sol_dutch,
    [arr_input([2, 0, 2, 1, 1, 0]), arr_input([2, 0, 1])],
    [arr_input([0]), arr_input([2, 2, 2]), arr_input([1, 0]), arr_input([2, 1, 0, 0, 1, 2])],
    lambda: arr_input([random.randint(0, 2) for _ in range(random.randint(1, SIZE))]))


def sol_merge(s):
    lines = s.strip().split('\n')
    n, m = ints(lines[0])
    A = ints(lines[1]) if n else []
    B = ints(lines[2]) if m else []
    return fmt(sorted(A + B))


def gen_merge():
    n, m = random.randint(1, SIZE), random.randint(1, SIZE)
    A = sorted(random.randint(-10**6, 10**6) for _ in range(n))
    B = sorted(random.randint(-10**6, 10**6) for _ in range(m))
    return f"{n} {m}\n{fmt(A)}\n{fmt(B)}\n"


add('arr-c-merge', 'Merge two sorted arrays', 'arrays', 'two-pointers', 900, ['arrays', 'two pointers', 'merge'],
    '<p>A and B are sorted in non-decreasing order. Print all n + m values in sorted order, in O(n + m) time.</p>',
    '<p>First line n and m (1 ≤ n, m ≤ 2·10<sup>5</sup>). Line 2: A. Line 3: B. (|values| ≤ 10<sup>6</sup>.)</p>', '<p>n + m integers.</p>', sol_merge,
    ["4 5\n1 4 7 9\n2 3 8 10 12\n", "3 3\n1 2 3\n4 5 6\n"],
    ["1 1\n5\n5\n", "2 3\n-5 -1\n-9 0 0\n", "3 1\n1 1 1\n1\n"], gen_merge)

