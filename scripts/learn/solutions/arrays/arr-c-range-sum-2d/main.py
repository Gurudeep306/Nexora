import sys
data = sys.stdin.buffer.read().split()
R, C, q = int(data[0]), int(data[1]), int(data[2])
P = [[0] * (C + 1) for _ in range(R + 1)]
idx = 3
for i in range(R):
    row, above = P[i + 1], P[i]
    for j in range(C):
        row[j + 1] = int(data[idx]) + above[j + 1] + row[j] - above[j]
        idx += 1
out = []
for _ in range(q):
    r1, c1, r2, c2 = (int(data[idx + t]) for t in range(4))
    idx += 4
    out.append(P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1])
print('\n'.join(map(str, out)))
