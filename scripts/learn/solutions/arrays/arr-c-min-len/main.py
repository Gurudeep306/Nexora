import sys
data = sys.stdin.buffer.read().split()
n, S = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
s = lo = 0
best = n + 1
for hi in range(n):
    s += a[hi]                       # extend to the right
    while s >= S:                    # big enough: record, then shrink
        if hi - lo + 1 < best:
            best = hi - lo + 1
        s -= a[lo]
        lo += 1
print(0 if best == n + 1 else best)
