import sys
data = sys.stdin.buffer.read().split()
N = 200000
mu = [1] * (N + 1)
mu[0] = 0
comp = bytearray(N + 1)
primes = []
for i in range(2, N + 1):                 # linear sieve for Mobius
    if not comp[i]:
        primes.append(i)
        mu[i] = -1
    for p in primes:
        ip = i * p
        if ip > N:
            break
        comp[ip] = 1
        if i % p == 0:
            mu[ip] = 0
            break
        mu[ip] = -mu[i]
pre = [0] * (N + 1)
for i in range(1, N + 1):
    pre[i] = pre[i - 1] + mu[i]

t = int(data[0])
out = []
for q in range(t):
    a, b, k = int(data[1 + 3 * q]), int(data[2 + 3 * q]), int(data[3 + 3 * q])
    A, B = a // k, b // k
    res, d, lim = 0, 1, min(A, B)
    while d <= lim:
        qa, qb = A // d, B // d
        e = min(A // qa, B // qb)         # both quotients constant on [d, e]
        res += (pre[e] - pre[d - 1]) * qa * qb
        d = e + 1
    out.append(str(res))
print('\n'.join(out))
