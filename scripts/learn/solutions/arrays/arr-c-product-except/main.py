import sys
data = sys.stdin.buffer.read().split()
MOD = 10**9 + 7
n = int(data[0])
a = [int(x) % MOD for x in data[1:1 + n]]
out = [1] * n
pre = 1
for i in range(n):                   # product left of i
    out[i] = pre
    pre = pre * a[i] % MOD
suf = 1
for i in range(n - 1, -1, -1):       # times product right of i
    out[i] = out[i] * suf % MOD
    suf = suf * a[i] % MOD
print(' '.join(map(str, out)))
