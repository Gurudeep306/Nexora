import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = sorted(map(int, data[1:1 + n]))
count = 0
for i in range(n):
    if i and a[i] == a[i - 1]:       # each first value once
        continue
    x, lo, hi = a[i], i + 1, n - 1
    while lo < hi:
        s = x + a[lo] + a[hi]
        if s < 0:
            lo += 1
        elif s > 0:
            hi -= 1
        else:
            count += 1
            lo += 1
            while lo < hi and a[lo] == a[lo - 1]:   # each second value once
                lo += 1
            hi -= 1
print(count)
