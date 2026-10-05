import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
t = int(data[0])
v = list(map(int, data[1:1 + 2 * t]))
out = []
for i in range(0, 2 * t, 2):
    rr, k = v[i] % MOD, v[i + 1]
    if rr == 1:
        out.append((k + 1) % MOD)                 # every term is 1 mod p
    else:
        out.append((pow(rr, k + 1, MOD) - 1) * pow(rr - 1, MOD - 2, MOD) % MOD)
print('\n'.join(map(str, out)))
