import sys
data = sys.stdin.buffer.read().split()
from math import gcd

t = int(data[0])
out = []
for i in range(t):
    a1, m1, a2, m2 = map(int, data[1 + 4 * i:5 + 4 * i])
    g = gcd(m1, m2)
    d = (a2 - a1) % m2
    if d % g:
        out.append(-1)
        continue
    mg = m2 // g
    k = (d // g) * pow(m1 // g, -1, mg) % mg if mg > 1 else 0   # m1 * k ≡ d (mod m2)
    out.append(a1 + m1 * k)
print('\n'.join(map(str, out)))
