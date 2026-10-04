import sys
data = sys.stdin.buffer.read().split()
R, C, m = int(data[0]), int(data[1]), int(data[2])
idx = 3
M = []
for i in range(R):
    M.append([int(x) for x in data[idx:idx + C]])
    idx += C
D = [[0] * (C + 1) for _ in range(R + 1)]
for _ in range(m):
    r1, c1, r2, c2, v = (int(data[idx + t]) for t in range(5))
    idx += 5
    D[r1][c1] += v                   # four corner marks
    D[r1][c2 + 1] -= v
    D[r2 + 1][c1] -= v
    D[r2 + 1][c2 + 1] += v
out = []
for i in range(R):
    row = []
    for j in range(C):               # 2D prefix sum of the marks
        if i:
            D[i][j] += D[i - 1][j]
        if j:
            D[i][j] += D[i][j - 1]
        if i and j:
            D[i][j] -= D[i - 1][j - 1]
        row.append(M[i][j] + D[i][j])
    out.append(' '.join(map(str, row)))
print('\n'.join(out))
