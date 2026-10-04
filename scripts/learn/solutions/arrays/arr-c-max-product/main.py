import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
hi = lo = best = a[0]                # max / min product ending here
for x in a[1:]:
    if x < 0:                        # a negative flips max and min
        hi, lo = lo, hi
    hi = max(x, hi * x)
    lo = min(x, lo * x)
    best = max(best, hi)
print(best)
