import sys
data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
a = data[2:2 + n]
cnt = {}
lo = distinct = best = 0
for hi in range(n):
    x = a[hi]
    c = cnt.get(x, 0)
    if c == 0:
        distinct += 1                # a new value entered the window
    cnt[x] = c + 1
    while distinct > k:
        y = a[lo]
        cnt[y] -= 1
        if cnt[y] == 0:
            distinct -= 1            # a value left the window completely
        lo += 1
    if hi - lo + 1 > best:
        best = hi - lo + 1
print(best)
