import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
w = 0
for r in range(n):
    if a[r] != 0:                    # keep non-zeros, in order
        a[w] = a[r]
        w += 1
for i in range(w, n):                # the rest are zeros
    a[i] = 0
print(' '.join(map(str, a)))
