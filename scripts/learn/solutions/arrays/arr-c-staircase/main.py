import sys
data = sys.stdin.buffer.read().split()
R, C = int(data[0]), int(data[1])
M = [list(map(int, data[2 + i * C: 2 + (i + 1) * C])) for i in range(R)]
idx = 2 + R * C
q = int(data[idx])
out = []
for x in map(int, data[idx + 1: idx + 1 + q]):
    i, j = 0, C - 1                  # top-right corner
    found = False
    while i < R and j >= 0:
        v = M[i][j]
        if v == x:
            found = True
            break
        if v > x:
            j -= 1                   # the whole column is too big
        else:
            i += 1                   # the whole row is too small
    out.append('YES' if found else 'NO')
print('\n'.join(out))
