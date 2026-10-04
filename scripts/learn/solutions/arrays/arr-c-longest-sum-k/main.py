import sys
data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
first = {0: 0}                       # prefix 0 before the first element
p = best = 0
for j in range(1, n + 1):
    p += int(data[1 + j])
    i = first.get(p - k)
    if i is not None and j - i > best:
        best = j - i
    if p not in first:               # keep the earliest position
        first[p] = j
print(best)
