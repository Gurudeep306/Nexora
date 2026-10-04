import sys
data = sys.stdin.buffer.read().split()
n = int(data[0])
h = list(map(int, data[1:1 + n]))
i, j, best = 0, n - 1, 0
while i < j:
    best = max(best, (j - i) * min(h[i], h[j]))
    if h[i] < h[j]:                  # the shorter wall can never do better
        i += 1
    else:
        j -= 1
print(best)
