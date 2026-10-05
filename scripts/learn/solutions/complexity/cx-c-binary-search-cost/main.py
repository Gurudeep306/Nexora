import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:n + 1]))
q = int(data[n + 1])
out = []
for x in map(int, data[n + 2:n + 2 + q]):
    lo, hi, probes = 0, n - 1, 0
    while lo <= hi:
        mid = (lo + hi) // 2
        probes += 1                    # one read of a[mid]
        v = a[mid]
        if v == x:
            break
        if v < x:
            lo = mid + 1
        else:
            hi = mid - 1
    out.append(probes)
print('\n'.join(map(str, out)))
