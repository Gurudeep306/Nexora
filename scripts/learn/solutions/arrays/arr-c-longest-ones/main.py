import sys
data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
a = data[2:2 + n]
lo = zeros = best = 0
for hi in range(n):
    if a[hi] == b'0':
        zeros += 1
    while zeros > k:                 # too many zeros to flip: shrink
        if a[lo] == b'0':
            zeros -= 1
        lo += 1
    if hi - lo + 1 > best:
        best = hi - lo + 1
print(best)
