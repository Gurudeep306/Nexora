import sys
data = sys.stdin.buffer.read().split()
R, C = int(data[0]), int(data[1])
a = [data[2 + i * C: 2 + (i + 1) * C] for i in range(R)]
out = []
for i in range(C):                   # output row i = input column i
    out.append(' '.join(a[j][i].decode() for j in range(R)))
print('\n'.join(out))
