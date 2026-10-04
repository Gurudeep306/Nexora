import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
a = list(map(int, data[1:1 + n]))
w = 1                                # a[0..w-1] = distinct values so far
for r in range(1, n):
    if a[r] != a[w - 1]:
        a[w] = a[r]
        w += 1
print(w)
print(' '.join(map(str, a[:w])))
