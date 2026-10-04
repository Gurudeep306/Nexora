import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
first = {0: 0}                       # prefix 0 before the first element
p = best = 0
for j in range(1, n + 1):
    p += 1 if data[j] == b'1' else -1    # count a 0 as -1
    if p in first:
        best = max(best, j - first[p])
    else:
        first[p] = j
print(best)
