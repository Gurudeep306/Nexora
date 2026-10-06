import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
t = int(data[0])
qs = [(int(data[1 + 2 * i]), int(data[2 + 2 * i])) for i in range(t)]
N = max(m for m, _ in qs)
inv = [0, 1] + [0] * (N - 1)
H = [0] * (N + 1)
h = 1 if N >= 1 else 0
H[1] = 1
for i in range(2, N + 1):
    v = (MOD - (MOD // i) * inv[MOD % i] % MOD) % MOD   # linear-time inverses
    inv[i] = v
    h = (h + v) % MOD
    H[i] = h
print('\n'.join(str(m * (H[m] - H[m - c]) % MOD) for m, c in qs))
