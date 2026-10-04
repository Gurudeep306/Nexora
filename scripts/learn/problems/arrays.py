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



# ─────────────────────────── Round 3: the deeper pages ───────────────────────────
# Every efficient reference below is cross-checked against a brute force on
# small random inputs before any test is generated.

from collections import Counter, deque
from itertools import combinations


def _check(fast, brute, gen, rounds=300):
    for _ in range(rounds):
        s = gen()
        assert fast(s) == brute(s), (s, fast(s), brute(s))


def read_arr(s):
    v = ints(s)
    return v[0], v[1:1 + v[0]]


# ── index as hash ──
def sol_missing_number(s):
    n, a = read_arr(s)
    return str(n * (n + 1) // 2 - sum(a))


def gen_missing(n=None):
    n = n or random.randint(1, SIZE)
    vals = list(range(n + 1))
    vals.remove(random.randint(0, n))
    random.shuffle(vals)
    return arr_input(vals)


add('arr-c-missing-number', 'The missing number', 'arrays', 'index-as-hash', 900, ['arrays', 'math', 'xor'],
    '<p>The array holds n <b>distinct</b> numbers taken from 0, 1, …, n — so exactly one number of that range is missing. Print it.</p><p>Do it in O(n) time and O(1) extra space (sum formula or XOR).</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n distinct integers from 0…n.</p>', '<p>The missing number.</p>', sol_missing_number,
    [arr_input([3, 0, 1]), arr_input([9, 6, 4, 2, 3, 5, 7, 0, 1])],
    [arr_input([0]), arr_input([1]), arr_input([1, 2]), arr_input([0, 2])],
    gen_missing, large=lambda: gen_missing(20000))


def sol_find_dups(s):
    n, a = read_arr(s)
    d = sorted(v for v, c in Counter(a).items() if c == 2)
    return fmt(d) if d else '-1'


def gen_dups(n=None):
    n = n or random.randint(1, 600)
    pool = list(range(1, n + 1))
    random.shuffle(pool)
    a = []
    while len(a) < n:
        v = pool.pop()
        a.append(v)
        if len(a) < n and random.random() < 0.4:
            a.append(v)
    random.shuffle(a)
    return arr_input(a)


add('arr-c-find-duplicates', 'All duplicates', 'arrays', 'index-as-hash', 1200, ['arrays', 'in-place', 'index as hash'],
    '<p>Every value is between 1 and n, and each value appears <b>once or twice</b>. Print, in increasing order, every value that appears twice — or <code>-1</code> if none does.</p><p>Aim for O(n) time and O(1) extra space: use the sign of a[|x| − 1] as a "seen" flag.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers, 1 ≤ a<sub>i</sub> ≤ n.</p>', '<p>The repeated values in increasing order, or -1.</p>', sol_find_dups,
    [arr_input([4, 3, 2, 7, 8, 2, 3, 1]), arr_input([1, 2])],
    [arr_input([1]), arr_input([1, 1]), arr_input([2, 2, 1, 1]), arr_input([3, 1, 2])],
    gen_dups, large=lambda: gen_dups(20000))


def sol_first_missing(s):
    n, a = read_arr(s)
    have = set(a)
    k = 1
    while k in have:
        k += 1
    return str(k)


def gen_first_missing(n=None):
    n = n or random.randint(1, SIZE)
    mode = random.random()
    if mode < 0.4:
        a = list(range(1, n + 1))
        if n > 1:
            a[random.randrange(n)] = random.choice([-5, 0, n + 7, 10**9])
    else:
        a = [random.randint(-n, n + 2) for _ in range(n)]
    random.shuffle(a)
    return arr_input(a)


add('arr-c-first-missing', 'First missing positive', 'arrays', 'index-as-hash', 1500, ['arrays', 'cyclic sort', 'index as hash'],
    '<p>Print the smallest positive integer that does <b>not</b> occur in the array.</p><p>The answer is always between 1 and n + 1. The classic target is O(n) time and O(1) extra space: place every value v ∈ [1, n] at index v − 1 (cyclic sort), then scan.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_first_missing,
    [arr_input([3, 4, -1, 1]), arr_input([7, 8, 9, 11, 12]), arr_input([1, 2, 0])],
    [arr_input([1]), arr_input([2]), arr_input([1, 1]), arr_input([2, 1]), arr_input([-1000000000, 1000000000])],
    gen_first_missing, large=lambda: gen_first_missing(20000))


# ── prefix sums + hashing ──
def sol_sub_k(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    seen = Counter({0: 1})
    p = cnt = 0
    for x in a:
        p += x
        cnt += seen[p - k]
        seen[p] += 1
    return str(cnt)


def brute_sub_k(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    return str(sum(1 for i in range(n) for j in range(i, n) if sum(a[i:j + 1]) == k))


def gen_sub_k(n=None, lo=-3, hi=3):
    n = n or random.randint(1, 1000)
    a = [random.randint(lo, hi) for _ in range(n)]
    return arr_input(a, extra_before=str(random.randint(-4, 4)))


_check(sol_sub_k, brute_sub_k, lambda: gen_sub_k(random.randint(1, 12)))
add('arr-c-subarray-sum-k', 'Count subarrays with sum k', 'arrays', 'prefix-hashing', 1400, ['arrays', 'prefix sums', 'hashing'],
    '<p>Count the contiguous subarrays whose sum is exactly k. Values may be negative, so a sliding window does not work.</p><p>Hint: a subarray (i, j] has sum P[j] − P[i]. For each prefix P[j], how many earlier prefixes equal P[j] − k?</p>',
    '<p>First line n and k (1 ≤ n ≤ 2·10<sup>5</sup>, |k| ≤ 10<sup>9</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>4</sup>).</p>', '<p>One integer: the number of subarrays (it can exceed 2<sup>31</sup>).</p>', sol_sub_k,
    [arr_input([1, 1, 1], extra_before='2'), arr_input([1, 2, 3], extra_before='3'), arr_input([3, 4, 7, 2, -3, 1, 4, 2], extra_before='7')],
    [arr_input([0] * 50, extra_before='0'), arr_input([5], extra_before='5'), arr_input([5], extra_before='4'), arr_input([1, -1] * 30, extra_before='0')],
    gen_sub_k, large=lambda: arr_input([random.randint(-1, 1) for _ in range(20000)], extra_before='0'))


def sol_longest_k(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    first = {0: 0}
    p = best = 0
    for j, x in enumerate(a, 1):
        p += x
        if p - k in first:
            best = max(best, j - first[p - k])
        first.setdefault(p, j)
    return str(best)


def brute_longest_k(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    return str(max([j - i + 1 for i in range(n) for j in range(i, n) if sum(a[i:j + 1]) == k] or [0]))


_check(sol_longest_k, brute_longest_k, lambda: gen_sub_k(random.randint(1, 12)))
add('arr-c-longest-sum-k', 'Longest subarray with sum k', 'arrays', 'prefix-hashing', 1400, ['arrays', 'prefix sums', 'hashing'],
    '<p>Print the length of the longest contiguous subarray whose sum is exactly k, or 0 if there is none. Values may be negative.</p><p>Hint: store the <b>first</b> index at which each prefix sum appears.</p>',
    '<p>First line n and k (1 ≤ n ≤ 2·10<sup>5</sup>, |k| ≤ 10<sup>9</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>4</sup>).</p>', '<p>One integer.</p>', sol_longest_k,
    [arr_input([1, -1, 5, -2, 3], extra_before='3'), arr_input([-2, -1, 2, 1], extra_before='1')],
    [arr_input([7], extra_before='3'), arr_input([3], extra_before='3'), arr_input([0, 0, 0], extra_before='0'), arr_input([1, 2, 3], extra_before='100')],
    gen_sub_k, large=lambda: arr_input([random.randint(-2, 2) for _ in range(20000)], extra_before='1'))


MOD = 10**9 + 7


def sol_prod_except(s):
    n, a = read_arr(s)
    pre = [1] * (n + 1)
    for i in range(n):
        pre[i + 1] = pre[i] * a[i] % MOD
    out = [0] * n
    suf = 1
    for i in range(n - 1, -1, -1):
        out[i] = pre[i] * suf % MOD
        suf = suf * a[i] % MOD
    return fmt(out)


def brute_prod_except(s):
    n, a = read_arr(s)
    out = []
    for i in range(n):
        p = 1
        for j in range(n):
            if j != i:
                p = p * a[j] % MOD
        out.append(p)
    return fmt(out)


def gen_prod(n=None):
    n = n or random.randint(1, SIZE)
    return arr_input([random.choice([0, 1, 2, random.randint(0, 10**9)]) if random.random() < 0.2 else random.randint(1, 10**9) for _ in range(n)])


_check(sol_prod_except, brute_prod_except, lambda: gen_prod(random.randint(1, 8)))
add('arr-c-product-except', 'Product of array except self', 'arrays', 'prefix-hashing', 1300, ['arrays', 'prefix products'],
    '<p>For every index i print the product of all elements <b>except</b> a<sub>i</sub>, modulo 10<sup>9</sup> + 7.</p><p>Division is not allowed (and does not work with zeros or under a modulus): combine a prefix product and a suffix product.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (0 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>).</p>', '<p>n integers. For n = 1 the empty product is 1.</p>', sol_prod_except,
    [arr_input([1, 2, 3, 4]), arr_input([0, 5, 2, 0, 3])],
    [arr_input([7]), arr_input([0]), arr_input([0, 0]), arr_input([10**9, 10**9, 10**9])],
    gen_prod, large=lambda: gen_prod(20000))


def sol_equal01(s):
    n, a = read_arr(s)
    first = {0: 0}
    p = best = 0
    for j, x in enumerate(a, 1):
        p += 1 if x == 1 else -1
        if p in first:
            best = max(best, j - first[p])
        else:
            first[p] = j
    return str(best)


def brute_equal01(s):
    n, a = read_arr(s)
    return str(max([j - i + 1 for i in range(n) for j in range(i, n) if a[i:j + 1].count(0) == a[i:j + 1].count(1)] or [0]))


def gen01(n=None):
    n = n or random.randint(1, SIZE)
    return arr_input([random.randint(0, 1) for _ in range(n)])


_check(sol_equal01, brute_equal01, lambda: gen01(random.randint(1, 12)))
add('arr-c-equal-zero-one', 'Equal zeros and ones', 'arrays', 'prefix-hashing', 1300, ['arrays', 'prefix sums', 'hashing'],
    '<p>The array contains only 0s and 1s. Print the length of the longest contiguous subarray with as many 0s as 1s (0 if there is none).</p><p>Hint: count a 0 as −1 — the question becomes "longest subarray with sum 0".</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n values, each 0 or 1.</p>', '<p>One integer.</p>', sol_equal01,
    [arr_input([0, 1, 0]), arr_input([0, 1, 1, 1, 0, 0, 1])],
    [arr_input([1]), arr_input([0, 0, 0]), arr_input([1, 0]), arr_input([1, 1, 0, 0, 1, 0])],
    gen01, large=lambda: gen01(20000))


# ── 2D ranges ──
def sol_sum2d(s):
    L = lines_of(s)
    R, C, q = map(int, L[0].split())
    M = [list(map(int, L[1 + i].split())) for i in range(R)]
    P = [[0] * (C + 1) for _ in range(R + 1)]
    for i in range(R):
        for j in range(C):
            P[i + 1][j + 1] = M[i][j] + P[i][j + 1] + P[i + 1][j] - P[i][j]
    out = []
    for line in L[1 + R:1 + R + q]:
        r1, c1, r2, c2 = map(int, line.split())
        out.append(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1])
    return '\n'.join(map(str, out))


def brute_sum2d(s):
    L = lines_of(s)
    R, C, q = map(int, L[0].split())
    M = [list(map(int, L[1 + i].split())) for i in range(R)]
    out = []
    for line in L[1 + R:1 + R + q]:
        r1, c1, r2, c2 = map(int, line.split())
        out.append(sum(M[i][j] for i in range(r1, r2 + 1) for j in range(c1, c2 + 1)))
    return '\n'.join(map(str, out))


def gen_sum2d(R=None, C=None, q=None, big=10**9):
    R = R or random.randint(1, 30)
    C = C or random.randint(1, 30)
    q = q or random.randint(1, 200)
    rows = [' '.join(str(random.randint(-big, big)) for _ in range(C)) for _ in range(R)]
    qs = []
    for _ in range(q):
        r1, r2 = sorted(random.randint(0, R - 1) for _ in range(2))
        c1, c2 = sorted(random.randint(0, C - 1) for _ in range(2))
        qs.append(f"{r1} {c1} {r2} {c2}")
    return f"{R} {C} {q}\n" + '\n'.join(rows) + '\n' + '\n'.join(qs) + '\n'


_check(sol_sum2d, brute_sum2d, lambda: gen_sum2d(random.randint(1, 5), random.randint(1, 5), random.randint(1, 6), 9))
add('arr-c-range-sum-2d', 'Rectangle sum queries', 'arrays', 'range-2d', 1300, ['arrays', 'prefix sums', '2d'],
    '<p>Answer q queries on an R × C matrix: each gives a rectangle by its top-left (r1, c1) and bottom-right (r2, c2) corners (0-based, inclusive) and asks for the sum of the values inside.</p><p>Build a 2D prefix sum once; each query is then four lookups (inclusion–exclusion).</p>',
    '<p>First line R C q (1 ≤ R, C ≤ 500, 1 ≤ q ≤ 2·10<sup>5</sup>). Next R lines: C integers each (|v| ≤ 10<sup>9</sup>). Next q lines: r1 c1 r2 c2 with r1 ≤ r2, c1 ≤ c2.</p>', '<p>q lines, one sum each.</p>', sol_sum2d,
    ["3 4 3\n3 0 1 4\n5 6 3 2\n1 2 0 1\n0 0 1 1\n1 1 2 3\n0 0 2 3\n"],
    ["1 1 1\n-7\n0 0 0 0\n", "2 2 2\n1000000000 1000000000\n1000000000 1000000000\n0 0 1 1\n1 0 1 1\n"],
    gen_sum2d, n_rand=6, large=lambda: gen_sum2d(80, 80, 3000))


def sol_add2d(s):
    L = lines_of(s)
    R, C, m = map(int, L[0].split())
    M = [list(map(int, L[1 + i].split())) for i in range(R)]
    D = [[0] * (C + 1) for _ in range(R + 1)]
    for line in L[1 + R:1 + R + m]:
        r1, c1, r2, c2, v = map(int, line.split())
        D[r1][c1] += v
        D[r1][c2 + 1] -= v
        D[r2 + 1][c1] -= v
        D[r2 + 1][c2 + 1] += v
    for i in range(R + 1):
        for j in range(C + 1):
            D[i][j] += (D[i - 1][j] if i else 0) + (D[i][j - 1] if j else 0) - (D[i - 1][j - 1] if i and j else 0)
    return '\n'.join(fmt(M[i][j] + D[i][j] for j in range(C)) for i in range(R))


def brute_add2d(s):
    L = lines_of(s)
    R, C, m = map(int, L[0].split())
    M = [list(map(int, L[1 + i].split())) for i in range(R)]
    for line in L[1 + R:1 + R + m]:
        r1, c1, r2, c2, v = map(int, line.split())
        for i in range(r1, r2 + 1):
            for j in range(c1, c2 + 1):
                M[i][j] += v
    return '\n'.join(fmt(r) for r in M)


def gen_add2d(R=None, C=None, m=None):
    R = R or random.randint(1, 30)
    C = C or random.randint(1, 30)
    m = m or random.randint(1, 300)
    rows = [' '.join(str(random.randint(-10**6, 10**6)) for _ in range(C)) for _ in range(R)]
    ups = []
    for _ in range(m):
        r1, r2 = sorted(random.randint(0, R - 1) for _ in range(2))
        c1, c2 = sorted(random.randint(0, C - 1) for _ in range(2))
        ups.append(f"{r1} {c1} {r2} {c2} {random.randint(-10**6, 10**6)}")
    return f"{R} {C} {m}\n" + '\n'.join(rows) + '\n' + '\n'.join(ups) + '\n'


_check(sol_add2d, brute_add2d, lambda: gen_add2d(random.randint(1, 5), random.randint(1, 5), random.randint(1, 6)))
add('arr-c-range-add-2d', 'Rectangle updates', 'arrays', 'range-2d', 1400, ['arrays', 'difference array', '2d'],
    '<p>Apply m updates to an R × C matrix; each adds v to every cell of the rectangle (r1, c1)–(r2, c2) (0-based, inclusive). Print the final matrix.</p><p>Each update should cost O(1): write four corners of a 2D difference array, then take its 2D prefix sum once.</p>',
    '<p>First line R C m (1 ≤ R, C ≤ 500, 1 ≤ m ≤ 2·10<sup>5</sup>). Next R lines: C integers (|v| ≤ 10<sup>6</sup>). Next m lines: r1 c1 r2 c2 v (r1 ≤ r2, c1 ≤ c2, |v| ≤ 10<sup>6</sup>).</p>', '<p>R lines with C integers each.</p>', sol_add2d,
    ["3 3 2\n0 0 0\n0 0 0\n0 0 0\n0 0 1 1 5\n1 1 2 2 -2\n"],
    ["1 1 1\n4\n0 0 0 0 -4\n", "2 3 1\n1 2 3\n4 5 6\n0 0 1 2 1000000\n"],
    gen_add2d, n_rand=6, large=lambda: gen_add2d(60, 60, 4000))


# ── k-sum ──
def sol_three_sum(s):
    n, a = read_arr(s)
    a = sorted(a)
    cnt = 0
    for i in range(n):
        if i and a[i] == a[i - 1]:
            continue
        lo, hi = i + 1, n - 1
        while lo < hi:
            t = a[i] + a[lo] + a[hi]
            if t < 0:
                lo += 1
            elif t > 0:
                hi -= 1
            else:
                cnt += 1
                lo += 1
                while lo < hi and a[lo] == a[lo - 1]:
                    lo += 1
                hi -= 1
    return str(cnt)


def brute_three_sum(s):
    n, a = read_arr(s)
    return str(len({tuple(sorted(c)) for c in combinations(a, 3) if sum(c) == 0}))


def gen_three(n=None, lo=-6, hi=6):
    n = n or random.randint(1, 3000)
    span = max(6, n // 3) if lo == -6 and n > 50 else hi
    return arr_input([random.randint(-span, span) for _ in range(n)])


_check(sol_three_sum, brute_three_sum, lambda: gen_three(random.randint(1, 12)))
add('arr-c-three-sum', '3-sum: count the triplets', 'arrays', 'k-sum', 1500, ['arrays', 'two pointers', 'sorting'],
    '<p>Count the <b>distinct</b> triplets of values {x, y, z} (taken from three different positions) with x + y + z = 0. Two triplets are the same if they contain the same values, e.g. (−1, 0, 1) and (0, 1, −1).</p><p>Sort, fix the first element, and run two pointers on the rest — skipping duplicates — for O(n²).</p>',
    '<p>First line n (1 ≤ n ≤ 3000). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>5</sup>).</p>', '<p>One integer.</p>', sol_three_sum,
    [arr_input([-1, 0, 1, 2, -1, -4]), arr_input([0, 0, 0, 0])],
    [arr_input([0]), arr_input([1, -1]), arr_input([0, 0, 0]), arr_input([1, 2, 3]), arr_input([-2, 1, 1, 1, -2, 4])],
    gen_three, n_rand=6, large=lambda: arr_input([random.randint(-1500, 1500) for _ in range(3000)]))


def sol_four_sum(s):
    v = ints(s)
    n, T = v[0], v[1]
    a = sorted(v[2:2 + n])
    cnt = 0
    for i in range(n):
        if i and a[i] == a[i - 1]:
            continue
        for j in range(i + 1, n):
            if j > i + 1 and a[j] == a[j - 1]:
                continue
            lo, hi = j + 1, n - 1
            while lo < hi:
                t = a[i] + a[j] + a[lo] + a[hi]
                if t < T:
                    lo += 1
                elif t > T:
                    hi -= 1
                else:
                    cnt += 1
                    lo += 1
                    while lo < hi and a[lo] == a[lo - 1]:
                        lo += 1
                    hi -= 1
    return str(cnt)


def brute_four_sum(s):
    v = ints(s)
    n, T = v[0], v[1]
    return str(len({tuple(sorted(c)) for c in combinations(v[2:2 + n], 4) if sum(c) == T}))


def gen_four(n=None):
    n = n or random.randint(1, 200)
    span = max(4, n // 4)
    return arr_input([random.randint(-span, span) for _ in range(n)], extra_before=str(random.randint(-span, span)))


_check(sol_four_sum, brute_four_sum, lambda: gen_four(random.randint(1, 10)))
add('arr-c-four-sum', '4-sum: count the quadruplets', 'arrays', 'k-sum', 1600, ['arrays', 'two pointers', 'sorting'],
    '<p>Count the distinct quadruplets of values (from four different positions) whose sum is T. As in 3-sum, quadruplets with the same multiset of values count once.</p><p>Two nested loops plus two pointers: O(n³).</p>',
    '<p>First line n and T (1 ≤ n ≤ 200, |T| ≤ 10<sup>9</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_four_sum,
    [arr_input([1, 0, -1, 0, -2, 2], extra_before='0'), arr_input([2, 2, 2, 2, 2], extra_before='8')],
    [arr_input([1, 2, 3], extra_before='6'), arr_input([10**9] * 4, extra_before=str(4 * 10**9 % (10**9 + 1))), arr_input([0, 0, 0, 0], extra_before='0')],
    gen_four, n_rand=6, large=lambda: arr_input([random.randint(-60, 60) for _ in range(200)], extra_before='3'))


def sol_three_closest(s):
    v = ints(s)
    n, T = v[0], v[1]
    a = sorted(v[2:2 + n])
    best = None
    for i in range(n):
        lo, hi = i + 1, n - 1
        while lo < hi:
            t = a[i] + a[lo] + a[hi]
            if best is None or abs(t - T) < abs(best - T) or (abs(t - T) == abs(best - T) and t < best):
                best = t
            if t < T:
                lo += 1
            elif t > T:
                hi -= 1
            else:
                return str(t)
    return str(best)


def brute_three_closest(s):
    v = ints(s)
    n, T = v[0], v[1]
    sums = [sum(c) for c in combinations(v[2:2 + n], 3)]
    return str(min(sums, key=lambda t: (abs(t - T), t)))


def gen_closest(n=None):
    n = n or random.randint(3, 3000)
    return arr_input([random.randint(-10**4, 10**4) for _ in range(n)], extra_before=str(random.randint(-3 * 10**4, 3 * 10**4)))


_check(sol_three_closest, brute_three_closest, lambda: arr_input([random.randint(-9, 9) for _ in range(random.randint(3, 9))], extra_before=str(random.randint(-30, 30))))
add('arr-c-three-closest', '3-sum closest', 'arrays', 'k-sum', 1500, ['arrays', 'two pointers', 'sorting'],
    '<p>Choose three elements at different positions whose sum is as close as possible to T. Print that sum. If two sums are equally close, print the smaller one.</p>',
    '<p>First line n and T (3 ≤ n ≤ 3000, |T| ≤ 3·10<sup>4</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>4</sup>).</p>', '<p>One integer.</p>', sol_three_closest,
    [arr_input([-1, 2, 1, -4], extra_before='1'), arr_input([0, 0, 0], extra_before='1')],
    [arr_input([1, 1, 1], extra_before='100'), arr_input([1, 2, 4, 8], extra_before='10'), arr_input([-3, 0, 3, 5], extra_before='1')],
    gen_closest, n_rand=6)


# ── water ──
def sol_container(s):
    n, h = read_arr(s)
    i, j, best = 0, n - 1, 0
    while i < j:
        best = max(best, (j - i) * min(h[i], h[j]))
        if h[i] < h[j]:
            i += 1
        else:
            j -= 1
    return str(best)


def brute_container(s):
    n, h = read_arr(s)
    return str(max([(j - i) * min(h[i], h[j]) for i in range(n) for j in range(i + 1, n)] or [0]))


def gen_heights(n=None, hi=10**4):
    n = n or random.randint(2, SIZE)
    return arr_input([random.randint(0, hi) for _ in range(n)])


_check(sol_container, brute_container, lambda: gen_heights(random.randint(2, 12), 9))
add('arr-c-container', 'Container with most water', 'arrays', 'water-problems', 1300, ['arrays', 'two pointers', 'greedy'],
    '<p>Vertical lines stand at x = 0, 1, …, n − 1 with heights h<sub>i</sub>. Two lines and the x-axis form a container holding (j − i) · min(h<sub>i</sub>, h<sub>j</sub>) water. Print the maximum.</p><p>O(n): start with the widest pair and always move the shorter line inward.</p>',
    '<p>First line n (2 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (0 ≤ h<sub>i</sub> ≤ 10<sup>4</sup>).</p>', '<p>One integer.</p>', sol_container,
    [arr_input([1, 8, 6, 2, 5, 4, 8, 3, 7]), arr_input([1, 1])],
    [arr_input([0, 0]), arr_input([5, 0, 0, 5]), arr_input([1, 2, 3, 4, 5]), arr_input([10000] * 7)],
    gen_heights, large=lambda: gen_heights(20000))


def sol_trap(s):
    n, h = read_arr(s)
    i, j, lmax, rmax, water = 0, n - 1, 0, 0, 0
    while i <= j:
        if lmax <= rmax:
            lmax = max(lmax, h[i])
            water += lmax - h[i]
            i += 1
        else:
            rmax = max(rmax, h[j])
            water += rmax - h[j]
            j -= 1
    return str(water)


def brute_trap(s):
    n, h = read_arr(s)
    return str(sum(max(0, min(max(h[:i + 1]), max(h[i:])) - h[i]) for i in range(n)))


_check(sol_trap, brute_trap, lambda: gen_heights(random.randint(1, 12), 6))
add('arr-c-trap-rain', 'Trapping rain water', 'arrays', 'water-problems', 1500, ['arrays', 'two pointers', 'prefix max'],
    '<p>Bars of width 1 have heights h<sub>0</sub> … h<sub>n−1</sub>. After it rains, how many units of water are trapped between them?</p><p>The water above bar i is min(highest bar to its left, highest bar to its right) − h<sub>i</sub>. Prefix maxima give O(n) time; two pointers give O(1) space.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (0 ≤ h<sub>i</sub> ≤ 10<sup>4</sup>).</p>', '<p>One integer.</p>', sol_trap,
    [arr_input([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]), arr_input([4, 2, 0, 3, 2, 5])],
    [arr_input([5]), arr_input([1, 2, 3, 4]), arr_input([4, 3, 2, 1]), arr_input([3, 0, 3]), arr_input([0, 0, 0])],
    lambda: gen_heights(random.randint(1, SIZE)), large=lambda: gen_heights(20000))


# ── window counting ──
def sol_exact_odd(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    seen = Counter({0: 1})
    p = cnt = 0
    for x in a:
        p += x & 1
        cnt += seen[p - k]
        seen[p] += 1
    return str(cnt)


def brute_exact_odd(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    return str(sum(1 for i in range(n) for j in range(i, n) if sum(x & 1 for x in a[i:j + 1]) == k))


def gen_odd(n=None):
    n = n or random.randint(1, SIZE)
    return arr_input([random.randint(1, 10**5) for _ in range(n)], extra_before=str(random.randint(1, max(1, min(n, 6)))))


_check(sol_exact_odd, brute_exact_odd, lambda: gen_odd(random.randint(1, 12)))
add('arr-c-exactly-k-odd', 'Subarrays with exactly k odd numbers', 'arrays', 'window-counting', 1500, ['arrays', 'sliding window', 'counting'],
    '<p>Count the contiguous subarrays that contain exactly k odd numbers.</p><p>"Exactly k" = "at most k" − "at most k − 1", and each "at most" is a sliding-window count.</p>',
    '<p>First line n and k (1 ≤ k ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (1 ≤ a<sub>i</sub> ≤ 10<sup>5</sup>).</p>', '<p>One integer (it can exceed 2<sup>31</sup>).</p>', sol_exact_odd,
    [arr_input([1, 1, 2, 1, 1], extra_before='3'), arr_input([2, 4, 6], extra_before='1'), arr_input([2, 2, 2, 1, 2, 2, 1, 2, 2, 2], extra_before='2')],
    [arr_input([1], extra_before='1'), arr_input([1] * 40, extra_before='1'), arr_input([2] * 30 + [1], extra_before='1')],
    gen_odd, large=lambda: arr_input([random.choice([1, 2]) for _ in range(20000)], extra_before='50'))


def sol_k_distinct(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    cnt = Counter()
    lo = best = 0
    for hi, x in enumerate(a):
        cnt[x] += 1
        while len(cnt) > k:
            cnt[a[lo]] -= 1
            if cnt[a[lo]] == 0:
                del cnt[a[lo]]
            lo += 1
        best = max(best, hi - lo + 1)
    return str(best)


def brute_k_distinct(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    return str(max([j - i + 1 for i in range(n) for j in range(i, n) if len(set(a[i:j + 1])) <= k] or [0]))


def gen_kd(n=None):
    n = n or random.randint(1, SIZE)
    vals = random.randint(1, max(1, n // 3))
    return arr_input([random.randint(1, vals) for _ in range(n)], extra_before=str(random.randint(1, 5)))


_check(sol_k_distinct, brute_k_distinct, lambda: gen_kd(random.randint(1, 12)))
add('arr-c-k-distinct', 'Longest subarray with at most k distinct values', 'arrays', 'window-counting', 1400, ['arrays', 'sliding window', 'hashing'],
    '<p>Print the length of the longest contiguous subarray containing at most k distinct values.</p><p>Keep a count of each value in the window; shrink from the left whenever more than k values are present.</p>',
    '<p>First line n and k (1 ≤ k ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (1 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_k_distinct,
    [arr_input([1, 2, 1, 2, 3], extra_before='2'), arr_input([1, 2, 1, 3, 4, 3, 5, 3], extra_before='2')],
    [arr_input([7], extra_before='1'), arr_input([1, 2, 3, 4], extra_before='1'), arr_input([1, 2, 3, 4], extra_before='4'), arr_input([10**9, 1, 10**9], extra_before='1')],
    gen_kd, large=lambda: gen_kd(20000))


def sol_window_maxes(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    dq, out = deque(), []
    for i, x in enumerate(a):
        while dq and a[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(a[dq[0]])
    return fmt(out)


def brute_window_maxes(s):
    v = ints(s)
    n, k = v[0], v[1]
    a = v[2:2 + n]
    return fmt(max(a[i:i + k]) for i in range(n - k + 1))


def gen_wm(n=None):
    n = n or random.randint(1, SIZE)
    return arr_input([random.randint(-10**9, 10**9) for _ in range(n)], extra_before=str(random.randint(1, n)))


_check(sol_window_maxes, brute_window_maxes, lambda: gen_wm(random.randint(1, 12)))
add('arr-c-window-maxima', 'Sliding window maximum', 'arrays', 'window-counting', 1500, ['arrays', 'monotonic deque', 'sliding window'],
    '<p>For every window of k consecutive elements, print its maximum (n − k + 1 values, left to right).</p><p>Recomputing each maximum is O(nk). A <b>monotonic deque</b> of indices — values decreasing from front to back — gives O(n) overall.</p>',
    '<p>First line n and k (1 ≤ k ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>n − k + 1 integers.</p>', sol_window_maxes,
    [arr_input([1, 3, -1, -3, 5, 3, 6, 7], extra_before='3'), arr_input([4, 2], extra_before='1')],
    [arr_input([5], extra_before='1'), arr_input([1, 2, 3, 4, 5], extra_before='5'), arr_input([5, 4, 3, 2, 1], extra_before='2'), arr_input([7, 7, 7, 7], extra_before='2')],
    gen_wm, large=lambda: arr_input([random.randint(-10**9, 10**9) for _ in range(20000)], extra_before='700'))


# ── Kadane variants ──
def sol_max_product(s):
    n, a = read_arr(s)
    hi = lo = best = a[0]
    for x in a[1:]:
        if x < 0:
            hi, lo = lo, hi
        hi = max(x, hi * x)
        lo = min(x, lo * x)
        best = max(best, hi)
    return str(best)


def brute_max_product(s):
    n, a = read_arr(s)
    best = None
    for i in range(n):
        p = 1
        for j in range(i, n):
            p *= a[j]
            best = p if best is None else max(best, p)
    return str(best)


def gen_mp(n=None):
    n = n or random.randint(1, 62)
    return arr_input([random.choice([-2, -1, 0, 1, 2, 2, -2, 1]) for _ in range(n)])


_check(sol_max_product, brute_max_product, lambda: gen_mp(random.randint(1, 12)))
add('arr-c-max-product', 'Maximum product subarray', 'arrays', 'kadane-variants', 1400, ['arrays', 'dynamic programming', 'kadane'],
    '<p>Print the largest product of a non-empty contiguous subarray.</p><p>A negative number turns the smallest product into the largest — so track both the maximum and the minimum product ending at each index.</p>',
    '<p>First line n (1 ≤ n ≤ 62). Second line n integers, each between −2 and 2 (so every product fits in a signed 64-bit integer).</p>', '<p>One integer.</p>', sol_max_product,
    [arr_input([2, 2, -2, 2]), arr_input([-2, 0, -1])],
    [arr_input([-2]), arr_input([0]), arr_input([-2, -2]), arr_input([-1, -1, -1]), arr_input([2] * 62), arr_input([-2] * 62), arr_input([-2] * 61)],
    gen_mp, n_rand=8)


def sol_circular(s):
    n, a = read_arr(s)
    cur_max = cur_min = 0
    best_max, best_min = a[0], a[0]
    total = 0
    cmx = cmn = None
    for x in a:
        total += x
        cmx = x if cmx is None else max(x, cmx + x)
        cmn = x if cmn is None else min(x, cmn + x)
        best_max = max(best_max, cmx)
        best_min = min(best_min, cmn)
    if best_max < 0:
        return str(best_max)
    return str(max(best_max, total - best_min))


def brute_circular(s):
    n, a = read_arr(s)
    best = None
    for i in range(n):
        t = 0
        for L in range(1, n + 1):
            t += a[(i + L - 1) % n]
            best = t if best is None else max(best, t)
    return str(best)


def gen_circ(n=None):
    n = n or random.randint(1, SIZE)
    return arr_input([random.randint(-10**9, 10**9) if random.random() < 0.5 else random.randint(-5, 5) for _ in range(n)])


_check(sol_circular, brute_circular, lambda: arr_input([random.randint(-6, 6) for _ in range(random.randint(1, 9))]))
add('arr-c-circular-max', 'Maximum circular subarray sum', 'arrays', 'kadane-variants', 1500, ['arrays', 'kadane'],
    '<p>The array is circular: after the last element comes the first. Print the largest sum of a non-empty contiguous subarray, where a subarray may wrap around the end (but uses each element at most once).</p><p>A wrapping subarray is the whole array minus a non-wrapping middle part — so subtract the <b>minimum</b> subarray sum from the total. Watch out when every element is negative.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_circular,
    [arr_input([5, -3, 5]), arr_input([1, -2, 3, -2]), arr_input([-3, -2, -3])],
    [arr_input([-5]), arr_input([7]), arr_input([3, -1, 2, -1]), arr_input([-2, 4, -5, 4, -5, 9, 4])],
    gen_circ, large=lambda: gen_circ(20000))


def sol_one_del(s):
    n, a = read_arr(s)
    keep, dele, best = a[0], float('-inf'), a[0]
    for x in a[1:]:
        dele = max(dele + x, keep)
        keep = max(keep + x, x)
        best = max(best, keep, dele)
    return str(best)


def brute_one_del(s):
    n, a = read_arr(s)
    best = None
    for i in range(n):
        for j in range(i, n):
            seg = a[i:j + 1]
            cands = [sum(seg)] + ([sum(seg) - min(seg)] if len(seg) > 1 else [])
            m = max(cands)
            best = m if best is None else max(best, m)
    return str(best)


_check(sol_one_del, brute_one_del, lambda: arr_input([random.randint(-6, 6) for _ in range(random.randint(1, 9))]))
add('arr-c-one-deletion', 'Maximum subarray sum with one deletion', 'arrays', 'kadane-variants', 1600, ['arrays', 'dynamic programming', 'kadane'],
    '<p>Choose a non-empty contiguous subarray and optionally delete <b>at most one</b> element from it; the subarray must still be non-empty after the deletion. Print the largest possible sum.</p><p>Run Kadane with two states per index: best sum ending here with no deletion yet, and with one deletion already used.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_one_del,
    [arr_input([1, -2, 0, 3]), arr_input([1, -2, -2, 3]), arr_input([-1, -1, -1, -1])],
    [arr_input([-7]), arr_input([5]), arr_input([2, -100, 2]), arr_input([-3, 8])],
    gen_circ, large=lambda: gen_circ(20000))


# ── majority n/3 ──
def sol_maj3(s):
    n, a = read_arr(s)
    c = Counter(a)
    res = sorted(v for v, k in c.items() if 3 * k > n)
    return fmt(res) if res else '-1'


def gen_maj3(n=None):
    n = n or random.randint(1, SIZE)
    hot = [random.randint(-10**9, 10**9) for _ in range(2)]
    a = [random.choice(hot) if random.random() < random.choice([0.3, 0.7, 0.8]) else random.randint(-10**9, 10**9) for _ in range(n)]
    return arr_input(a)


add('arr-c-majority-n3', 'Elements appearing more than n/3 times', 'arrays', 'majority-vote', 1500, ['arrays', 'boyer-moore', 'voting'],
    '<p>Print, in increasing order, every value that occurs more than ⌊n/3⌋ times — that is, strictly more than n/3 times. There can be at most two. Print <code>-1</code> if there are none.</p><p>Extended Boyer–Moore: keep two candidates and two counters, then verify both in a second pass. O(n) time, O(1) space.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>, a<sub>i</sub> ≠ −1).</p>', '<p>The values in increasing order, or -1.</p>', sol_maj3,
    [arr_input([3, 2, 3]), arr_input([1, 1, 1, 3, 3, 2, 2, 2]), arr_input([1, 2, 3])],
    [arr_input([5]), arr_input([1, 2]), arr_input([2, 2, 1, 1, 3, 3]), arr_input([4, 4, 4, 4])],
    gen_maj3, large=lambda: gen_maj3(20000))


# ── matrices ──
def sol_set_zeroes(s):
    L = lines_of(s)
    R, C = map(int, L[0].split())
    M = [list(map(int, L[1 + i].split())) for i in range(R)]
    rows = {i for i in range(R) if 0 in M[i]}
    cols = {j for j in range(C) if any(M[i][j] == 0 for i in range(R))}
    return '\n'.join(fmt(0 if (i in rows or j in cols) else M[i][j] for j in range(C)) for i in range(R))


def gen_mat_z(R=None, C=None):
    R = R or random.randint(1, 60)
    C = C or random.randint(1, 60)
    p = random.choice([0.0, 0.02, 0.1])
    rows = [' '.join(str(0 if random.random() < p else random.randint(-10**9, 10**9)) for _ in range(C)) for _ in range(R)]
    return f"{R} {C}\n" + '\n'.join(rows) + '\n'


add('arr-c-set-zeroes', 'Set matrix zeroes', 'arrays', 'matrix-techniques', 1200, ['arrays', 'matrix', 'in-place'],
    '<p>Wherever the matrix holds a 0, set its entire row and column to 0. Print the result.</p><p>Only zeros of the <b>original</b> matrix count — zeros you write must not spread further. The O(1)-space trick stores the row/column flags in the first row and column.</p>',
    '<p>First line R C (1 ≤ R, C ≤ 500). Next R lines: C integers (|v| ≤ 10<sup>9</sup>).</p>', '<p>R lines with C integers.</p>', sol_set_zeroes,
    ["3 3\n1 1 1\n1 0 1\n1 1 1\n", "3 4\n0 1 2 0\n3 4 5 2\n1 3 1 5\n"],
    ["1 1\n0\n", "1 1\n5\n", "2 2\n1 2\n3 4\n", "2 3\n1 0 3\n4 5 6\n"],
    gen_mat_z, n_rand=6, large=lambda: gen_mat_z(150, 150))


def sol_staircase(s):
    L = lines_of(s)
    R, C = map(int, L[0].split())
    M = [list(map(int, L[1 + i].split())) for i in range(R)]
    present = {v for row in M for v in row}
    q = int(L[1 + R])
    return '\n'.join('YES' if int(x) in present else 'NO' for x in L[2 + R].split()[:q])


def gen_stair(R=None, C=None, q=None):
    R = R or random.randint(1, 40)
    C = C or random.randint(1, 40)
    q = q or random.randint(1, 200)
    M = [[0] * C for _ in range(R)]
    for i in range(R):
        for j in range(C):
            base = max(M[i - 1][j] if i else -50, M[i][j - 1] if j else -50)
            M[i][j] = base + random.randint(0, 3)
    vals = [random.randint(-60, M[-1][-1] + 5) for _ in range(q)]
    return f"{R} {C}\n" + '\n'.join(fmt(r) for r in M) + f"\n{q}\n" + fmt(vals) + '\n'


add('arr-c-staircase', 'Search a sorted matrix', 'arrays', 'matrix-techniques', 1200, ['arrays', 'matrix', 'two pointers'],
    '<p>Every row of the matrix is sorted left to right and every column top to bottom. For each query x, print YES if x occurs in the matrix and NO otherwise.</p><p>Start at the top-right corner: if the value is too big go left, if too small go down — O(R + C) per query.</p>',
    '<p>First line R C (1 ≤ R, C ≤ 300). Next R lines: C integers (|v| ≤ 10<sup>9</sup>), sorted as described. Then q (1 ≤ q ≤ 300) and a line with q integers.</p>', '<p>q lines, YES or NO.</p>', sol_staircase,
    ["3 4\n1 4 7 11\n2 5 8 12\n3 6 9 16\n3\n5 13 1\n"],
    ["1 1\n7\n2\n7 8\n", "2 2\n1 1\n1 1\n2\n1 0\n"],
    gen_stair, n_rand=6, large=lambda: gen_stair(300, 300, 300))


# ── more classics ──
def sol_next_perm(s):
    n, a = read_arr(s)
    i = n - 2
    while i >= 0 and a[i] >= a[i + 1]:
        i -= 1
    if i >= 0:
        j = n - 1
        while a[j] <= a[i]:
            j -= 1
        a[i], a[j] = a[j], a[i]
    a[i + 1:] = reversed(a[i + 1:])
    return fmt(a)


def brute_next_perm(s):
    from itertools import permutations
    n, a = read_arr(s)
    perms = sorted(set(permutations(a)))
    k = perms.index(tuple(a))
    return fmt(perms[(k + 1) % len(perms)])


_check(sol_next_perm, brute_next_perm, lambda: arr_input([random.randint(1, 4) for _ in range(random.randint(1, 6))]))
add('arr-c-next-permutation', 'Next permutation', 'arrays', 'reverse-rotate', 1400, ['arrays', 'two pointers', 'permutations'],
    '<p>Rearrange the array into the next lexicographically greater permutation of its values. If it is already the largest, wrap around to the smallest (sorted ascending). Print the result.</p><p>Find the rightmost i with a<sub>i</sub> &lt; a<sub>i+1</sub>, swap a<sub>i</sub> with the rightmost larger element, then reverse the suffix — O(n), in place.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (|a<sub>i</sub>| ≤ 10<sup>9</sup>); values may repeat.</p>', '<p>The next permutation.</p>', sol_next_perm,
    [arr_input([1, 2, 3]), arr_input([3, 2, 1]), arr_input([1, 1, 5])],
    [arr_input([7]), arr_input([1, 3, 2]), arr_input([2, 3, 1]), arr_input([1, 5, 1]), arr_input([5, 5, 5])],
    lambda: arr_input([random.randint(-5, 5) for _ in range(random.randint(1, SIZE))]), large=lambda: arr_input(list(range(20000, 0, -1))[:-3] + [3, 1, 2]))


def sol_stock(s):
    n, a = read_arr(s)
    lo, best = a[0], 0
    for x in a[1:]:
        best = max(best, x - lo)
        lo = min(lo, x)
    return str(best)


def brute_stock(s):
    n, a = read_arr(s)
    return str(max([a[j] - a[i] for i in range(n) for j in range(i + 1, n)] + [0]))


_check(sol_stock, brute_stock, lambda: arr_input([random.randint(1, 9) for _ in range(random.randint(1, 10))]))
add('arr-c-stock', 'Best time to buy and sell', 'arrays', 'kadane', 1000, ['arrays', 'greedy', 'kadane'],
    '<p>a<sub>i</sub> is a stock price on day i. Buy on one day and sell on a <b>later</b> day to maximise profit. Print the best profit, or 0 if no trade makes money.</p><p>Scan once, remembering the cheapest price so far.</p>',
    '<p>First line n (1 ≤ n ≤ 2·10<sup>5</sup>). Second line n integers (1 ≤ a<sub>i</sub> ≤ 10<sup>9</sup>).</p>', '<p>One integer.</p>', sol_stock,
    [arr_input([7, 1, 5, 3, 6, 4]), arr_input([7, 6, 4, 3, 1])],
    [arr_input([5]), arr_input([1, 10**9]), arr_input([10**9, 1]), arr_input([3, 3, 3])],
    lambda: arr_input([random.randint(1, 10**9) for _ in range(random.randint(1, SIZE))]), large=lambda: arr_input([random.randint(1, 10**9) for _ in range(20000)]))


def sol_dyn(s):
    n = int(s.split()[0])
    cap, copies = 1, 0
    while cap < n:
        copies += cap
        cap *= 2
    return f"{copies} {cap}"


def brute_dyn(s):
    n = int(s.split()[0])
    cap = size = copies = 0
    cap = 1
    for _ in range(n):
        if size == cap:
            copies += size
            cap *= 2
        size += 1
    return f"{copies} {cap}"


_check(sol_dyn, brute_dyn, lambda: f"{random.randint(1, 3000)}\n")
add('arr-c-dyn-copies', 'Cost of a growing array', 'arrays', 'amortized-analysis', 1100, ['arrays', 'amortized analysis', 'math'],
    '<p>A dynamic array starts with capacity 1 and size 0. Each push appends one element; when the array is full before a push, it first doubles its capacity, copying every existing element to the new block. After n pushes, print the total number of element copies and the final capacity.</p><p>n can be 10<sup>18</sup> — you cannot simulate. Count the copies at each doubling.</p>',
    '<p>One integer n (1 ≤ n ≤ 10<sup>18</sup>).</p>', '<p>Two integers: total copies and final capacity.</p>', sol_dyn,
    ["1\n", "5\n", "8\n"],
    ["2\n", "3\n", "1000000000000000000\n", str(2**59) + "\n", str(2**59 + 1) + "\n"],
    lambda: f"{random.choice([random.randint(1, 1000), random.randint(1, 10**18)])}\n", n_rand=6)
