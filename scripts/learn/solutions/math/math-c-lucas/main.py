import sys
data = sys.stdin.buffer.read().split()
p, t = int(data[0]), int(data[1])
F = [1] * p
for i in range(1, p):
    F[i] = F[i - 1] * i % p
IF = [1] * p
IF[p - 1] = pow(F[p - 1], p - 2, p)
for i in range(p - 1, 0, -1):
    IF[i - 1] = IF[i] * i % p
out = []
for i in range(t):
    n, r = int(data[2 + 2 * i]), int(data[3 + 2 * i])
    res = 1
    while (n or r) and res:                 # one base-p digit at a time
        n, a = divmod(n, p)
        r, b = divmod(r, p)
        res = 0 if b > a else res * F[a] * IF[b] * IF[a - b] % p
    out.append(res)
print('\n'.join(map(str, out)))
