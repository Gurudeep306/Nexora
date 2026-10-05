import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
t = int(data[0])
qs = list(map(int, data[1:1 + t]))
N = max(qs)
inv = [0, 1] + [0] * (N - 1)
for i in range(2, N + 1):
    inv[i] = (MOD - (MOD // i) * inv[MOD % i] % MOD) % MOD   # linear inverses
H = [0] * (N + 1)
h = 0
for i in range(1, N + 1):
    h += inv[i]
    if h >= MOD:
        h -= MOD
    H[i] = h                                                   # H_i mod p
print('\n'.join(str(n * H[n] % MOD) for n in qs))
