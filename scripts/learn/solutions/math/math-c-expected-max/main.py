import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
m, k = int(data[0]), int(data[1])
e = k % (MOD - 1)                        # Fermat: exponents can be reduced mod p-1
S = sum(pow(y, e, MOD) for y in range(1, m)) % MOD
# E[max] = m - sum_{y<m} (y/m)^k
print((m - S * pow(pow(m, e, MOD), MOD - 2, MOD)) % MOD)
