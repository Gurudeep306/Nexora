import sys
data = sys.stdin.buffer.read().split()
n, W = int(data[0]), int(data[1])
best = [0] * (W + 1)
for i in range(n):
    w, v = int(data[2 + 2 * i]), int(data[3 + 2 * i])
    if w > W:
        continue
    # whole-row update from the OLD row: new[c] = max(old[c], old[c - w] + v)
    best[w:] = map(max, best[w:], [b + v for b in best[:W + 1 - w]])
print(best[W])
