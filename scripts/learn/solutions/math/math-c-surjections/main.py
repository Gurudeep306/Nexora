import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
n, k = int(data[0]), int(data[1])
f = [1] * (k + 1)
for i in range(1, k + 1):
    f[i] = f[i - 1] * i % MOD
inv = [1] * (k + 1)
inv[k] = pow(f[k], MOD - 2, MOD)
for i in range(k, 0, -1):
    inv[i - 1] = inv[i] * i % MOD
ans = 0
for i in range(k + 1):
    term = f[k] * inv[i] % MOD * inv[k - i] % MOD * pow(k - i, n, MOD) % MOD
    ans = ans - term if i & 1 else ans + term   # inclusion-exclusion over idle workers
print(ans % MOD)
