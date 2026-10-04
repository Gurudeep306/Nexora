import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
cur = best = a[0]                    # best subarray ending here / anywhere
for x in a[1:]:
    cur = max(x, cur + x)            # extend, or start fresh at x
    if cur > best:
        best = cur
print(best)
