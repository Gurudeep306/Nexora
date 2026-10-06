import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
t = int(data[0])
qs = list(map(int, data[1:1 + t]))
N = max(qs)
D = [1] * (N + 1)
F = [1] * (N + 1)
d, f = 1, 1
for i in range(1, N + 1):
    d = (i * d + (-1 if i & 1 else 1)) % MOD    # D_n = n D_{n-1} + (-1)^n
    f = f * i % MOD
    D[i] = d
    F[i] = f
print('\n'.join(str(D[n] * pow(F[n], MOD - 2, MOD) % MOD) for n in qs))
