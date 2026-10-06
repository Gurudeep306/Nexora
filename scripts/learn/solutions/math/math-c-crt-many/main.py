import sys
data = sys.stdin.buffer.read().split()
from math import gcd

n = int(data[0])
X, M = 0, 1                       # all x ≡ X (mod M) satisfy the prefix
for i in range(n):
    a, m = int(data[1 + 2 * i]), int(data[2 + 2 * i])
    g = gcd(M, m)
    d = (a - X) % m
    if d % g:
        print(-1)
        break
    mg = m // g
    k = (d // g) * pow(M // g % mg, -1, mg) % mg if mg > 1 else 0
    X += M * k
    M = M // g * m
else:
    print(X)
