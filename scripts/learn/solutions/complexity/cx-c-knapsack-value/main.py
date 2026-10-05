import sys
data = sys.stdin.buffer.read().split()
n, W = int(data[0]), int(data[1])
items = [(int(data[2 + 2 * i]), int(data[3 + 2 * i])) for i in range(n)]
V = sum(v for _, v in items)
INF = 1 << 62
mw = [0] + [INF] * V                    # min weight for value exactly t
for w, v in items:
    # whole-row update from the OLD row: new[t] = min(old[t], old[t - v] + w)
    mw[v:] = map(min, mw[v:], [x + w for x in mw[:V + 1 - v]])
ans = V
while mw[ans] > W:
    ans -= 1
print(ans)
