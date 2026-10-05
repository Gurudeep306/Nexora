import sys
data = sys.stdin.buffer.read().split()
P = 10**9 + 7
qs = list(map(int, data[1:1 + int(data[0])]))
mx = max(qs)
inv = [0, 1] + [0] * (mx - 1)
for i in range(2, mx + 1):
    inv[i] = (P - (P // i) * inv[P % i] % P) % P     # linear-time inverses
H = [0] * (mx + 1)
h = 0
for i in range(1, mx + 1):
    h += inv[i]
    if h >= P:
        h -= P
    H[i] = h
print('\n'.join(str((2 * (n + 1) * H[n] - 4 * n) % P) for n in qs))
