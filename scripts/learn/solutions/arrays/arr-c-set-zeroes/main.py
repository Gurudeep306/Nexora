import sys
data = sys.stdin.buffer.read().split()
R, C = int(data[0]), int(data[1])
M = [list(map(int, data[2 + i * C: 2 + (i + 1) * C])) for i in range(R)]
row0 = any(v == 0 for v in M[0])
col0 = any(M[i][0] == 0 for i in range(R))
for i in range(1, R):
    for j in range(1, C):
        if M[i][j] == 0:             # flags in row 0 / column 0
            M[i][0] = M[0][j] = 0
for i in range(1, R):
    for j in range(1, C):
        if M[i][0] == 0 or M[0][j] == 0:
            M[i][j] = 0
if row0:                             # the flag row/column last
    M[0] = [0] * C
if col0:
    for i in range(R):
        M[i][0] = 0
print('\n'.join(' '.join(map(str, row)) for row in M))
