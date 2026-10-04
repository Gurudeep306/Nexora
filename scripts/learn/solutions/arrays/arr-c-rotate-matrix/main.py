import sys
data = sys.stdin.buffer.read().split()
N = int(data[0])
a = [data[1 + i * N: 1 + (i + 1) * N] for i in range(N)]
for i in range(N):                   # transpose
    for j in range(i + 1, N):
        a[i][j], a[j][i] = a[j][i], a[i][j]
for row in a:                        # mirror each row
    row.reverse()
print('\n'.join(' '.join(x.decode() for x in row) for row in a))
