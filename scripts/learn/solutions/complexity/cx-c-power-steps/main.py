import sys
data = sys.stdin.buffer.read().split()
t = int(data[0])
v = list(map(int, data[1:1 + 2 * t]))
out = []
for i in range(0, 2 * t, 2):
    n, c = v[i], v[i + 1]
    k, p = 0, 1
    while p < n:           # at most 60 steps since c >= 2
        p *= c
        k += 1
    out.append(k)
print('\n'.join(map(str, out)))
