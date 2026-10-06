import sys
data = sys.stdin.buffer.read().split()
from math import isqrt

q = int(data[0])
xs = list(map(int, data[1:1 + q]))
N = max(xs)
spf = list(range(N + 1))                 # spf[v] = v until a smaller prime is found
r = isqrt(N)
is_p = bytearray([1]) * (r + 1)
primes = []
for p in range(2, r + 1):
    if is_p[p]:
        primes.append(p)
        is_p[p * p::p] = bytes(len(range(p * p, r + 1, p)))
# larger primes first, so smaller ones overwrite: the last write is the smallest factor
for p in reversed(primes):
    spf[p * p::p] = [p] * len(range(p * p, N + 1, p))

out = []
for x in xs:
    f = []
    while x > 1:
        p = spf[x]
        f.append(p)
        x //= p
    out.append(' '.join(map(str, f)))
sys.stdout.write('\n'.join(out) + '\n')
