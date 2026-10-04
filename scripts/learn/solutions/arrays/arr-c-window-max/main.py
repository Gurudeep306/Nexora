import sys
data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
s = sum(a[:k])
best = s                             # the first window, not 0
for i in range(k, n):
    s += a[i] - a[i - k]             # one enters, one leaves
    if s > best:
        best = s
print(best)
