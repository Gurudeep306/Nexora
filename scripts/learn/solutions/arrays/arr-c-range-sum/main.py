import sys
data = sys.stdin.buffer.read().split()
n, q = int(data[0]), int(data[1])
P = [0] * (n + 1)                    # P[i] = a[0] + ... + a[i-1]
for i in range(n):
    P[i + 1] = P[i] + int(data[2 + i])
out = []
idx = 2 + n
for _ in range(q):
    l, r = int(data[idx]), int(data[idx + 1])
    idx += 2
    out.append(P[r + 1] - P[l])
print('\n'.join(map(str, out)))
