import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
v = list(map(int, data[1:1 + 4 * t]))
out = []
for i in range(0, 4 * t, 4):
    a, C, b, c = v[i:i + 4]
    d = C - a

    def q(n):
        return d * n * n - b * n - c

    c0 = max(1, b // (2 * d))        # integer minimiser is c0 or c0 + 1
    m = c0 + 1 if q(c0 + 1) < 0 else c0 if q(c0) < 0 else 0
    if m == 0:                       # q >= 0 for every n >= 1
        out.append(1)
        continue
    lo, hi = m, 2 * 10**6            # q(lo) < 0, q(hi) >= 0
    while lo < hi:                   # last n with q(n) < 0
        mid = (lo + hi + 1) // 2
        if q(mid) < 0:
            lo = mid
        else:
            hi = mid - 1
    out.append(lo + 1)
print('\n'.join(map(str, out)))
