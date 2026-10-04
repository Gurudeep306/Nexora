import sys
data = sys.stdin.buffer.read().split()
n, m = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
D = [0] * (n + 1)
idx = 2 + n
for _ in range(m):
    l, r, v = int(data[idx]), int(data[idx + 1]), int(data[idx + 2])
    idx += 3
    D[l] += v                        # the addition starts at l
    D[r + 1] -= v                    # ... and stops after r
run = 0
out = []
for i in range(n):
    run += D[i]
    out.append(a[i] + run)
print(' '.join(map(str, out)))
